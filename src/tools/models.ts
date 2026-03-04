import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ProviderRegistry } from '../providers/registry.js'

const TIER_VALUES = ['basic', 'standard', 'advanced', 'frontier'] as const

export function registerModelsTool(server: McpServer, registry: ProviderRegistry) {
  server.tool(
    'list_models',
    'List all available LLM models with pricing, sorted by cost (cheapest first). Shows which providers are configured, cost per million tokens, and quality tiers. Useful for deciding which model to force via ask(model: "...") or understanding why the router picked a specific model.',
    {
      tier: z.enum(TIER_VALUES).optional().describe('Filter by minimum quality tier'),
      provider: z.enum(['openai', 'google']).optional().describe('Filter by provider'),
    },
    async ({ tier, provider }) => {
      let models = registry.getAllModels()

      if (provider) {
        models = models.filter((m) => m.provider === provider)
      }

      if (tier) {
        const tierOrder = ['basic', 'standard', 'advanced', 'frontier']
        const minIdx = tierOrder.indexOf(tier)
        models = models.filter((m) => tierOrder.indexOf(m.tier) >= minIdx)
      }

      // Sort by weighted cost
      models.sort(
        (a, b) =>
          a.inputPricePer1M + 3 * a.outputPricePer1M -
          (b.inputPricePer1M + 3 * b.outputPricePer1M),
      )

      if (models.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No models available. Configure OPENAI_API_KEY or GOOGLE_API_KEY.',
            },
          ],
        }
      }

      // Build table
      const lines = [
        '| Model | Provider | Tier | Input $/M | Output $/M | Context | Aliases |',
        '|-------|----------|------|-----------|------------|---------|---------|',
      ]
      for (const m of models) {
        const ctx =
          m.contextWindow >= 1_000_000
            ? `${(m.contextWindow / 1_000_000).toFixed(0)}M`
            : `${(m.contextWindow / 1_000).toFixed(0)}K`
        lines.push(
          `| ${m.displayName} | ${m.provider} | ${m.tier} | $${m.inputPricePer1M.toFixed(2)} | $${m.outputPricePer1M.toFixed(2)} | ${ctx} | ${m.aliases.join(', ')} |`,
        )
      }

      lines.push('')
      lines.push(`Configured providers: ${registry.getConfiguredProviders().join(', ')}`)
      lines.push(
        `Baseline for savings: Claude Opus 4 ($5.00/$25.00 per M tokens)`,
      )

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    },
  )
}
