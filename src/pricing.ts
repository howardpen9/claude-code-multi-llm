import { type ModelDef, QualityTier } from './types.js'

export const MODEL_CATALOG: ModelDef[] = [
  // --- Google: BASIC ---
  {
    id: 'google/gemini-2.5-flash-lite',
    provider: 'google',
    modelName: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    tier: QualityTier.BASIC,
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: false,
    aliases: ['flash-lite', 'gemini-flash-lite'],
  },
  // --- OpenAI: STANDARD ---
  {
    id: 'openai/gpt-4.1-mini',
    provider: 'openai',
    modelName: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 Mini',
    tier: QualityTier.STANDARD,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    inputPricePer1M: 0.40,
    outputPricePer1M: 1.60,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: false,
    aliases: ['gpt-4.1-mini', '4.1-mini'],
  },
  // --- Google: ADVANCED ---
  {
    id: 'google/gemini-2.5-flash',
    provider: 'google',
    modelName: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    tier: QualityTier.ADVANCED,
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: true,
    aliases: ['flash', 'gemini-flash'],
  },
  // --- OpenAI: ADVANCED ---
  {
    id: 'openai/gpt-4.1',
    provider: 'openai',
    modelName: 'gpt-4.1',
    displayName: 'GPT-4.1',
    tier: QualityTier.ADVANCED,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    inputPricePer1M: 2.00,
    outputPricePer1M: 8.00,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: false,
    aliases: ['gpt-4.1', '4.1'],
  },
  {
    id: 'google/gemini-2.5-pro',
    provider: 'google',
    modelName: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    tier: QualityTier.ADVANCED,
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: true,
    aliases: ['gemini-pro', 'gemini'],
  },
  // --- OpenAI: FRONTIER ---
  {
    id: 'openai/o3-mini',
    provider: 'openai',
    modelName: 'o3-mini',
    displayName: 'o3-mini',
    tier: QualityTier.FRONTIER,
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    inputPricePer1M: 1.10,
    outputPricePer1M: 4.40,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: true,
    aliases: ['o3-mini'],
  },
  {
    id: 'openai/gpt-5',
    provider: 'openai',
    modelName: 'gpt-5',
    displayName: 'GPT-5',
    tier: QualityTier.FRONTIER,
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    inputPricePer1M: 2.50,
    outputPricePer1M: 15.00,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsThinking: false,
    aliases: ['gpt5', 'gpt-5'],
  },
]

// Baseline for savings calculation (Claude Opus 4 pricing, updated 2026-03)
export const BASELINE_PRICING = {
  id: 'claude-opus-4',
  inputPricePer1M: 15.00,
  outputPricePer1M: 75.00,
}

export function findModel(nameOrAlias: string): ModelDef | undefined {
  const lower = nameOrAlias.toLowerCase()
  return MODEL_CATALOG.find(
    (m) =>
      m.id === lower ||
      m.modelName.toLowerCase() === lower ||
      m.displayName.toLowerCase() === lower ||
      m.aliases.some((a) => a.toLowerCase() === lower),
  )
}
