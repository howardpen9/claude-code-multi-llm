import { z } from 'zod'
import { QualityTier, type AppConfig, type ProviderName } from './types.js'
import path from 'node:path'
import os from 'node:os'

const tierValues = ['basic', 'standard', 'advanced', 'frontier'] as const

const ConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  DEFAULT_TIER: z.enum(tierValues).optional(),
  DEFAULT_MODEL: z.string().optional(),
  MAX_BUDGET_PER_REQUEST: z.string().optional(),
  PREFERRED_PROVIDER: z.enum(['openai', 'google']).optional(),
  COST_LOG_PATH: z.string().optional(),
  BASELINE_MODEL: z.string().optional(),
})

export function loadConfig(): AppConfig {
  const parsed = ConfigSchema.parse(process.env)

  const hasOpenAI = !!parsed.OPENAI_API_KEY
  const hasGoogle = !!parsed.GOOGLE_API_KEY

  if (!hasOpenAI && !hasGoogle) {
    console.error(
      '[llm-router] Warning: No API keys configured. Set OPENAI_API_KEY and/or GOOGLE_API_KEY.',
    )
  }

  const defaultLogPath = path.join(os.homedir(), '.llm-router', 'cost-log.jsonl')

  return {
    defaultTier: (parsed.DEFAULT_TIER as QualityTier) ?? QualityTier.STANDARD,
    defaultModel: parsed.DEFAULT_MODEL || undefined,
    maxBudgetPerRequestUsd: parsed.MAX_BUDGET_PER_REQUEST
      ? parseFloat(parsed.MAX_BUDGET_PER_REQUEST)
      : undefined,
    preferredProvider: parsed.PREFERRED_PROVIDER as ProviderName | undefined,
    costLogPath: parsed.COST_LOG_PATH || defaultLogPath,
    baselineModel: parsed.BASELINE_MODEL || 'claude-opus-4',
    providers: {
      openai: hasOpenAI ? { apiKey: parsed.OPENAI_API_KEY! } : undefined,
      google: hasGoogle ? { apiKey: parsed.GOOGLE_API_KEY! } : undefined,
    },
  }
}
