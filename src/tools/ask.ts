import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ProviderRegistry } from '../providers/registry.js'
import type { CostTracker } from '../cost-tracker.js'
import type { AppConfig } from '../types.js'
import { QualityTier } from '../types.js'
import { classifyTask, selectModel } from '../router.js'

const TIER_VALUES = ['basic', 'standard', 'advanced', 'frontier'] as const

export function registerAskTool(
  server: McpServer,
  registry: ProviderRegistry,
  costTracker: CostTracker,
  config: AppConfig,
) {
  server.tool(
    'ask',
    `Delegate a prompt to a cheaper LLM. Claude Code uses this to offload subtasks that don't need Opus-level intelligence (translation, summarization, formatting, simple Q&A, code explanation).

The router automatically picks the cheapest model that can handle the task quality tier. Override with 'model' for a specific model or 'tier' for minimum quality.

Returns the response plus cost metadata showing how much was saved vs using Claude Opus.`,
    {
      prompt: z.string().describe('The prompt to send to the cheaper model'),
      model: z
        .string()
        .optional()
        .describe('Force a specific model (e.g. "gemini-flash-lite", "gpt-4.1-mini"). Bypasses auto-routing.'),
      tier: z
        .enum(TIER_VALUES)
        .optional()
        .describe(
          'Minimum quality tier. basic: translate/format/summarize. standard: general Q&A. advanced: code review. frontier: deep reasoning.',
        ),
      system_prompt: z.string().optional().describe('Custom system prompt'),
      temperature: z.number().min(0).max(2).optional().describe('Temperature (default: 0.7)'),
      max_tokens: z.number().optional().describe('Max output tokens'),
    },
    async ({ prompt, model, tier, system_prompt, temperature, max_tokens }) => {
      try {
        // 1. Resolve model
        let selectedModel
        if (model) {
          selectedModel = registry.findModel(model)
          if (!selectedModel) {
            const available = registry.getAllModels().map((m) => m.id).join(', ')
            return {
              content: [{ type: 'text' as const, text: `Model "${model}" not found. Available: ${available}` }],
              isError: true,
            }
          }
        } else {
          const qualityTier = tier ? (tier as QualityTier) : classifyTask(prompt)
          const candidates = registry.getModelsForTier(qualityTier)
          const decision = selectModel(candidates, {
            preferredProvider: config.preferredProvider,
            maxBudgetPer1MInput: config.maxBudgetPerRequestUsd
              ? config.maxBudgetPerRequestUsd * 1_000_000
              : undefined,
          })
          if (!decision) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `No models available for tier "${tier || 'auto'}". Configure OPENAI_API_KEY or GOOGLE_API_KEY.`,
                },
              ],
              isError: true,
            }
          }
          selectedModel = decision.model
        }

        // 2. Call provider
        const provider = registry.getProvider(selectedModel.provider)
        const result = await provider.generate({
          model: selectedModel.modelName,
          systemPrompt: system_prompt,
          messages: [{ role: 'user', content: prompt }],
          maxOutputTokens: max_tokens,
          temperature: temperature ?? 0.7,
        })

        // 3. Track cost
        const classifiedTier = tier ? (tier as string) : classifyTask(prompt)
        const entry = costTracker.record({
          toolName: 'ask',
          model: selectedModel,
          usage: result.usage,
          latencyMs: result.latencyMs,
          classifiedTier: typeof classifiedTier === 'string' ? classifiedTier : classifiedTier,
          promptExcerpt: prompt,
        })

        // 4. Return
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  response: result.text,
                  meta: {
                    model: selectedModel.id,
                    tier: selectedModel.tier,
                    cost_usd: entry.costUsd,
                    baseline_cost_usd: entry.baselineCostUsd,
                    saved_usd: round(entry.baselineCostUsd - entry.costUsd, 6),
                    saved_percent:
                      entry.baselineCostUsd > 0
                        ? round((1 - entry.costUsd / entry.baselineCostUsd) * 100, 1)
                        : 0,
                    tokens: result.usage,
                    latency_ms: result.latencyMs,
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

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}
