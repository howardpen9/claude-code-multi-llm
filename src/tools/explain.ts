import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ProviderRegistry } from '../providers/registry.js'
import type { AppConfig } from '../types.js'
import { classifyTask, selectModel } from '../router.js'

export function registerExplainTool(
  server: McpServer,
  registry: ProviderRegistry,
  config: AppConfig,
) {
  server.tool(
    'route_explain',
    'Debug routing decisions without making any LLM call. Shows which quality tier the router assigns to a prompt, which model would be selected, why, and what alternatives exist. Use when a routed answer seems wrong or to understand cost-optimization choices before calling ask.',
    {
      prompt: z.string().describe('The prompt to analyze'),
    },
    async ({ prompt }) => {
      const tier = classifyTask(prompt)
      const candidates = registry.getModelsForTier(tier)
      const decision = selectModel(candidates, {
        preferredProvider: config.preferredProvider,
      })

      const result = {
        classified_tier: tier,
        prompt_length: prompt.length,
        available_models: candidates.length,
        selected: decision
          ? {
              model: decision.model.id,
              display_name: decision.model.displayName,
              tier: decision.model.tier,
              input_price_per_1m: decision.model.inputPricePer1M,
              output_price_per_1m: decision.model.outputPricePer1M,
              reason: decision.reason,
            }
          : null,
        alternatives: decision?.alternatives ?? [],
        configured_providers: registry.getConfiguredProviders(),
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
