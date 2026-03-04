import { QualityTier, tierIndex, type ModelDef, type RouteDecision, type ProviderName } from './types.js'

// === Task Classifier ===

const BASIC_SIGNALS = /\b(translat\w*|format\w*|convert\w*|summariz\w*|json|csv|list\s+all|count\s+the)\b/i
const ADVANCED_SIGNALS =
  /\b(review\w*|debug\w*|refactor\w*|architect\w*|secur\w*|vulnerab\w*|race\s+condition|should\s+we|compare|trade.?off|is\s+this\s+correct)\b/i
const FRONTIER_SIGNALS =
  /\b(deep\s+reason\w*|novel|prove|formal\s+verif\w*|zero.?day|exploit\w*|from\s+scratch)\b/i
const SIMPLICITY_SIGNALS = /\b(simple|quick|just|briefly|short|one.?line)\b/i

export function classifyTask(
  prompt: string,
  options?: { forceTier?: QualityTier },
): QualityTier {
  if (options?.forceTier) return options.forceTier

  // Check signals from strongest to weakest
  if (FRONTIER_SIGNALS.test(prompt)) return QualityTier.FRONTIER
  if (ADVANCED_SIGNALS.test(prompt)) {
    // Downgrade if simplicity signals present
    if (SIMPLICITY_SIGNALS.test(prompt)) return QualityTier.STANDARD
    return QualityTier.ADVANCED
  }
  if (BASIC_SIGNALS.test(prompt)) return QualityTier.BASIC

  // Length heuristic
  if (prompt.length < 100) return QualityTier.BASIC
  if (prompt.length > 2000) return QualityTier.ADVANCED

  return QualityTier.STANDARD
}

// === Model Selector ===

function weightedCost(m: ModelDef): number {
  // Output tokens are typically 3-5x more expensive, weight 1:3
  return m.inputPricePer1M + 3 * m.outputPricePer1M
}

export function selectModel(
  candidates: ModelDef[],
  options?: {
    preferModel?: string
    preferredProvider?: ProviderName
    maxBudgetPer1MInput?: number
  },
): RouteDecision | null {
  if (candidates.length === 0) return null

  // Sort by weighted cost, then by preferred provider
  const sorted = [...candidates].sort((a, b) => {
    const costDiff = weightedCost(a) - weightedCost(b)
    if (Math.abs(costDiff) > 0.001) return costDiff
    // Tiebreaker: prefer specified provider
    if (options?.preferredProvider) {
      if (a.provider === options.preferredProvider && b.provider !== options.preferredProvider)
        return -1
      if (b.provider === options.preferredProvider && a.provider !== options.preferredProvider)
        return 1
    }
    return 0
  })

  // Apply budget cap
  let selected = sorted
  if (options?.maxBudgetPer1MInput) {
    const affordable = sorted.filter((m) => m.inputPricePer1M <= options.maxBudgetPer1MInput!)
    if (affordable.length > 0) selected = affordable
  }

  const chosen = selected[0]!
  return {
    model: chosen,
    tier: chosen.tier,
    reason: `Cheapest ${chosen.tier} model ($${weightedCost(chosen).toFixed(2)} weighted/M)`,
    alternatives: sorted.slice(1, 4).map((m) => ({
      id: m.id,
      weightedCost: weightedCost(m),
    })),
  }
}

export function route(
  candidates: ModelDef[],
  prompt: string,
  options?: {
    forceTier?: QualityTier
    preferModel?: string
    preferredProvider?: ProviderName
    maxBudgetPer1MInput?: number
  },
): { decision: RouteDecision; classifiedTier: QualityTier } | null {
  const tier = classifyTask(prompt, { forceTier: options?.forceTier })

  // Filter to models at or above the classified tier
  const eligible = candidates.filter((m) => tierIndex(m.tier) >= tierIndex(tier))

  const decision = selectModel(eligible, {
    preferModel: options?.preferModel,
    preferredProvider: options?.preferredProvider,
    maxBudgetPer1MInput: options?.maxBudgetPer1MInput,
  })

  if (!decision) return null
  return { decision, classifiedTier: tier }
}
