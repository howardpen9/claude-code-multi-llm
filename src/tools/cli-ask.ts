import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { detectAvailableCLIs, spawnCLI, type CLIDef } from '../providers/cli-spawn.js'
import type { CostTracker } from '../cost-tracker.js'

let cachedCLIs: CLIDef[] | null = null

async function getAvailableCLIs(): Promise<CLIDef[]> {
  if (!cachedCLIs) {
    cachedCLIs = await detectAvailableCLIs()
  }
  return cachedCLIs
}

export function registerCLIAskTool(server: McpServer, costTracker: CostTracker) {
  server.tool(
    'cli_ask',
    `Send a prompt to an external LLM CLI using SUBSCRIPTION credits (not API credits).

Unlike 'ask' (which calls APIs and costs per-token), this tool spawns installed CLIs that use your existing subscriptions:
- codex → uses your ChatGPT Pro/Max subscription
- gemini → uses your Google AI Studio free tier
- kimi → uses your Kimi subscription

Trade-offs: slower (CLI startup overhead), no token counting, but effectively FREE if you have the subscription.`,
    {
      prompt: z.string().describe('The prompt to send'),
      cli: z
        .enum(['codex', 'kimi', 'gemini'])
        .optional()
        .describe('Specific CLI to use. If not set, uses the first available one.'),
    },
    async ({ prompt, cli: cliName }) => {
      try {
        const available = await getAvailableCLIs()

        if (available.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No LLM CLIs detected. Install at least one:\n- `npm i -g @openai/codex`\n- `npm i -g @google/gemini-cli`\n- `uv tool install kimi-cli`',
              },
            ],
            isError: true,
          }
        }

        // Select CLI
        let target: CLIDef | undefined
        if (cliName) {
          target = available.find((c) => c.name === cliName)
          if (!target) {
            const names = available.map((c) => c.name).join(', ')
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `CLI "${cliName}" not found. Available: ${names}`,
                },
              ],
              isError: true,
            }
          }
        } else {
          target = available[0]!
        }

        // Spawn CLI
        const result = await spawnCLI(target, prompt)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  response: result.text,
                  meta: {
                    cli: target.name,
                    billing: 'subscription (no API credit consumed)',
                    cost_usd: 0,
                    latency_ms: result.latencyMs,
                    note: `Used ${target.name} CLI — billed to your ${target.name === 'codex' ? 'ChatGPT' : target.name === 'gemini' ? 'Google AI Studio' : 'Kimi'} subscription`,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // Also add a tool to check which CLIs are available
  server.tool(
    'cli_status',
    'Check which LLM CLIs are installed and available for subscription-based usage.',
    {},
    async () => {
      const available = await detectAvailableCLIs()
      cachedCLIs = available // refresh cache

      const allNames = ['codex', 'kimi', 'gemini'] as const
      const status = allNames.map((name) => {
        const found = available.some((c) => c.name === name)
        return {
          cli: name,
          installed: found,
          billing: found ? 'subscription credits' : 'N/A',
          install_cmd:
            name === 'codex'
              ? 'npm i -g @openai/codex'
              : name === 'gemini'
                ? 'npm i -g @google/gemini-cli'
                : 'uv tool install kimi-cli',
        }
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ available: available.map((c) => c.name), details: status }, null, 2),
          },
        ],
      }
    },
  )
}
