import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { AppConfig, ProviderName } from '../types.js'
import { QualityTier } from '../types.js'

const TIER_VALUES = ['basic', 'standard', 'advanced', 'frontier'] as const

export function registerConfigureTool(server: McpServer, config: AppConfig) {
  server.tool(
    'configure',
    'View or update router configuration for this session. Changes are not persisted across restarts — edit .env for permanent changes.',
    {
      default_tier: z.enum(TIER_VALUES).optional().describe('Set default quality tier'),
      preferred_provider: z
        .enum(['openai', 'google'])
        .optional()
        .describe('Set preferred provider (used as tiebreaker when costs are equal)'),
      budget_cap: z
        .number()
        .optional()
        .describe('Max USD per request (e.g. 0.01). Set to 0 to remove cap.'),
      show_current: z
        .boolean()
        .optional()
        .describe('Just show current config without changes (default: true if no other params)'),
    },
    async ({ default_tier, preferred_provider, budget_cap, show_current }) => {
      const changes: string[] = []

      if (default_tier) {
        config.defaultTier = default_tier as QualityTier
        changes.push(`default_tier → ${default_tier}`)
      }
      if (preferred_provider) {
        config.preferredProvider = preferred_provider as ProviderName
        changes.push(`preferred_provider → ${preferred_provider}`)
      }
      if (budget_cap !== undefined) {
        config.maxBudgetPerRequestUsd = budget_cap > 0 ? budget_cap : undefined
        changes.push(
          budget_cap > 0
            ? `budget_cap → $${budget_cap}`
            : 'budget_cap → removed',
        )
      }

      const current = {
        default_tier: config.defaultTier,
        default_model: config.defaultModel ?? 'auto',
        preferred_provider: config.preferredProvider ?? 'none',
        budget_cap_usd: config.maxBudgetPerRequestUsd ?? 'none',
        baseline_model: config.baselineModel,
        configured_providers: Object.entries(config.providers)
          .filter(([, v]) => v?.apiKey)
          .map(([k]) => k),
      }

      const text =
        changes.length > 0
          ? `Updated: ${changes.join(', ')}\n\nCurrent config:\n${JSON.stringify(current, null, 2)}`
          : `Current config:\n${JSON.stringify(current, null, 2)}`

      return { content: [{ type: 'text' as const, text }] }
    },
  )
}
