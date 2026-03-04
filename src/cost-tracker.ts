import fs from 'node:fs'
import path from 'node:path'
import type { CostEntry, CostReport, ModelDef, TokenUsage } from './types.js'
import { BASELINE_PRICING } from './pricing.js'

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

export class CostTracker {
  private entries: CostEntry[] = []
  private logStream: fs.WriteStream | null = null

  constructor(logPath?: string) {
    if (logPath) {
      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true })
        this.logStream = fs.createWriteStream(logPath, { flags: 'a' })
      } catch {
        // Non-fatal: continue without disk logging
      }
    }
  }

  record(params: {
    toolName: string
    model: ModelDef
    usage: TokenUsage
    latencyMs: number
    classifiedTier?: string
    promptExcerpt?: string
  }): CostEntry {
    const costUsd = this.calculateCost(
      params.model.inputPricePer1M,
      params.model.outputPricePer1M,
      params.usage,
    )
    const baselineCostUsd = this.calculateCost(
      BASELINE_PRICING.inputPricePer1M,
      BASELINE_PRICING.outputPricePer1M,
      params.usage,
    )

    const entry: CostEntry = {
      timestamp: Date.now(),
      toolName: params.toolName,
      model: params.model.id,
      tier: params.model.tier,
      ...(params.classifiedTier && { classifiedTier: params.classifiedTier as any }),
      ...(params.promptExcerpt && { promptExcerpt: params.promptExcerpt.slice(0, 100) }),
      usage: params.usage,
      costUsd: round(costUsd, 8),
      baselineCostUsd: round(baselineCostUsd, 8),
      latencyMs: params.latencyMs,
    }

    this.entries.push(entry)
    this.logStream?.write(JSON.stringify(entry) + '\n')
    return entry
  }

  private calculateCost(
    inputPricePer1M: number,
    outputPricePer1M: number,
    usage: TokenUsage,
  ): number {
    return (
      (usage.inputTokens * inputPricePer1M) / 1_000_000 +
      (usage.outputTokens * outputPricePer1M) / 1_000_000
    )
  }

  getReport(filter?: { from?: number; to?: number }): CostReport {
    let filtered = this.entries
    if (filter?.from) filtered = filtered.filter((e) => e.timestamp >= filter.from!)
    if (filter?.to) filtered = filtered.filter((e) => e.timestamp <= filter.to!)

    const totalCostUsd = filtered.reduce((s, e) => s + e.costUsd, 0)
    const totalBaselineCostUsd = filtered.reduce((s, e) => s + e.baselineCostUsd, 0)

    const byModel: Record<string, { requests: number; costUsd: number }> = {}
    const byTool: Record<string, { requests: number; costUsd: number }> = {}

    for (const e of filtered) {
      if (!byModel[e.model]) byModel[e.model] = { requests: 0, costUsd: 0 }
      byModel[e.model].requests++
      byModel[e.model].costUsd = round(byModel[e.model].costUsd + e.costUsd, 8)

      if (!byTool[e.toolName]) byTool[e.toolName] = { requests: 0, costUsd: 0 }
      byTool[e.toolName].requests++
      byTool[e.toolName].costUsd = round(byTool[e.toolName].costUsd + e.costUsd, 8)
    }

    return {
      totalRequests: filtered.length,
      totalCostUsd: round(totalCostUsd, 6),
      totalBaselineCostUsd: round(totalBaselineCostUsd, 6),
      savingsUsd: round(totalBaselineCostUsd - totalCostUsd, 6),
      savingsPercent:
        totalBaselineCostUsd > 0
          ? round((1 - totalCostUsd / totalBaselineCostUsd) * 100, 1)
          : 0,
      byModel,
      byTool,
      period: {
        from: filtered[0]?.timestamp ?? 0,
        to: filtered[filtered.length - 1]?.timestamp ?? 0,
      },
    }
  }

  getEntryCount(): number {
    return this.entries.length
  }
}
