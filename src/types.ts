// === Quality Tiers ===
export enum QualityTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  ADVANCED = 'advanced',
  FRONTIER = 'frontier',
}

export const TIER_ORDER = [
  QualityTier.BASIC,
  QualityTier.STANDARD,
  QualityTier.ADVANCED,
  QualityTier.FRONTIER,
] as const

export function tierIndex(tier: QualityTier): number {
  return TIER_ORDER.indexOf(tier)
}

// === Provider Names ===
export type ProviderName = 'openai' | 'google'

// === Model Definition ===
export interface ModelDef {
  id: string // e.g. "google/gemini-2.5-flash-lite"
  provider: ProviderName
  modelName: string // API model name
  displayName: string
  tier: QualityTier
  contextWindow: number
  maxOutputTokens: number
  inputPricePer1M: number // USD
  outputPricePer1M: number // USD
  supportsSystemPrompt: boolean
  supportsStreaming: boolean
  supportsThinking: boolean
  aliases: string[]
}

// === Provider Interface ===
export interface LLMProvider {
  readonly name: ProviderName
  isConfigured(): boolean
  listModels(): ModelDef[]
  generate(request: GenerateRequest): Promise<GenerateResult>
}

export interface GenerateRequest {
  model: string
  systemPrompt?: string
  messages: MessageTurn[]
  maxOutputTokens?: number
  temperature?: number
  thinking?: boolean
}

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerateResult {
  text: string
  thinking?: string
  model: string
  usage: TokenUsage
  latencyMs: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

// === Cost Tracking ===
export interface CostEntry {
  timestamp: number
  toolName: string
  model: string
  tier: QualityTier
  classifiedTier?: QualityTier // tier assigned by router (before model selection)
  promptExcerpt?: string // first 100 chars of prompt for analysis
  usage: TokenUsage
  costUsd: number
  baselineCostUsd: number
  latencyMs: number
}

export interface CostReport {
  totalRequests: number
  totalCostUsd: number
  totalBaselineCostUsd: number
  savingsUsd: number
  savingsPercent: number
  byModel: Record<string, { requests: number; costUsd: number }>
  byTool: Record<string, { requests: number; costUsd: number }>
  period: { from: number; to: number }
}

// === Router ===
export interface RouteDecision {
  model: ModelDef
  tier: QualityTier
  reason: string
  alternatives: Array<{ id: string; weightedCost: number }>
}

// === Configuration ===
export interface AppConfig {
  defaultTier: QualityTier
  defaultModel?: string
  maxBudgetPerRequestUsd?: number
  preferredProvider?: ProviderName
  costLogPath: string
  baselineModel: string
  disablePromptLogging: boolean
  providers: {
    openai?: { apiKey: string; baseUrl?: string }
    google?: { apiKey: string }
  }
}
