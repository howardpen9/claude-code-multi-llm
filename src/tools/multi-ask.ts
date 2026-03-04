import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ProviderRegistry } from '../providers/registry.js'
import type { CostTracker } from '../cost-tracker.js'

export function registerMultiAskTool(
  server: McpServer,
  registry: ProviderRegistry,
  costTracker: CostTracker,
) {
  server.tool(
    'multi_ask',
    `Send the same prompt to multiple LLMs in parallel and compare their responses. Faster and cheaper than /multi-llm (which spawns CLI subprocesses).

Use for cross-validation: get 2-3 perspectives on architecture decisions, debugging hypotheses, or code review findings.`,
    {
      prompt: z.string().describe('The prompt to send to all models'),
      models: z
        .array(z.string())
        .optional()
        .describe(
          'Specific models to query (e.g. ["gemini-flash", "gpt-4.1-mini"]). Default: auto-pick cheapest 2 from different providers.',
        ),
      system_prompt: z.string().optional().describe('Shared system prompt for all models'),
      max_tokens: z.number().optional().describe('Max output tokens per model'),
    },
    async ({ prompt, models, system_prompt, max_tokens }) => {
      try {
        // Resolve models
        let targetModels = models
          ?.map((name) => registry.findModel(name))
          .filter((m) => m !== undefined)

        if (!targetModels || targetModels.length === 0) {
          // Auto-pick: cheapest from each configured provider
          const allModels = registry.getAllModels()
          const byProvider = new Map<string, (typeof allModels)[0]>()
          // Sort by cost first
          const sorted = [...allModels].sort(
            (a, b) =>
              a.inputPricePer1M + 3 * a.outputPricePer1M -
              (b.inputPricePer1M + 3 * b.outputPricePer1M),
          )
          for (const m of sorted) {
            if (!byProvider.has(m.provider)) byProvider.set(m.provider, m)
          }
          targetModels = Array.from(byProvider.values()).slice(0, 3)
        }

        if (targetModels.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No models available. Configure OPENAI_API_KEY or GOOGLE_API_KEY.',
              },
            ],
            isError: true,
          }
        }

        // Call all models in parallel
        const results = await Promise.allSettled(
          targetModels.map(async (model) => {
            const provider = registry.getProvider(model.provider)
            const result = await provider.generate({
              model: model.modelName,
              systemPrompt: system_prompt,
              messages: [{ role: 'user', content: prompt }],
              maxOutputTokens: max_tokens,
              temperature: 0.7,
            })

            const entry = costTracker.record({
              toolName: 'multi_ask',
              model,
              usage: result.usage,
              latencyMs: result.latencyMs,
            })

            return {
              model: model.id,
              displayName: model.displayName,
              response: result.text,
              cost_usd: entry.costUsd,
              tokens: result.usage,
              latency_ms: result.latencyMs,
            }
          }),
        )

        const responses = results.map((r, i) => {
          if (r.status === 'fulfilled') return r.value
          return {
            model: targetModels[i]!.id,
            displayName: targetModels[i]!.displayName,
            response: `Error: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
            cost_usd: 0,
            tokens: { inputTokens: 0, outputTokens: 0 },
            latency_ms: 0,
          }
        })

        const totalCost = responses.reduce((s, r) => s + r.cost_usd, 0)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  responses,
                  summary: {
                    models_queried: responses.length,
                    total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
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
}
