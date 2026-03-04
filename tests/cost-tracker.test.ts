import { describe, it, expect } from 'vitest'
import { CostTracker } from '../src/cost-tracker.js'
import { QualityTier } from '../src/types.js'
import { MODEL_CATALOG } from '../src/pricing.js'

describe('CostTracker', () => {
  function makeTracker() {
    return new CostTracker() // no disk logging in tests
  }

  const flashLite = MODEL_CATALOG.find((m) => m.id === 'google/gemini-2.5-flash-lite')!

  it('records a cost entry', () => {
    const tracker = makeTracker()
    const entry = tracker.record({
      toolName: 'ask',
      model: flashLite,
      usage: { inputTokens: 1000, outputTokens: 500 },
      latencyMs: 200,
    })

    expect(entry.costUsd).toBeGreaterThan(0)
    expect(entry.baselineCostUsd).toBeGreaterThan(entry.costUsd)
    expect(entry.model).toBe('google/gemini-2.5-flash-lite')
  })

  it('calculates savings correctly', () => {
    const tracker = makeTracker()

    // Flash-Lite: input $0.10/M, output $0.40/M
    // Baseline (Opus): input $5.00/M, output $25.00/M
    tracker.record({
      toolName: 'ask',
      model: flashLite,
      usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      latencyMs: 100,
    })

    const report = tracker.getReport()
    expect(report.totalRequests).toBe(1)
    // Flash-Lite cost: $0.10 + $0.40 = $0.50
    expect(report.totalCostUsd).toBeCloseTo(0.5, 2)
    // Opus baseline: $5.00 + $25.00 = $30.00
    expect(report.totalBaselineCostUsd).toBeCloseTo(30.0, 2)
    // Savings: $29.50 = 98.3%
    expect(report.savingsUsd).toBeCloseTo(29.5, 1)
    expect(report.savingsPercent).toBeGreaterThan(98)
  })

  it('groups by model and tool', () => {
    const tracker = makeTracker()
    const gpt = MODEL_CATALOG.find((m) => m.id === 'openai/gpt-4.1-mini')!

    tracker.record({
      toolName: 'ask',
      model: flashLite,
      usage: { inputTokens: 100, outputTokens: 50 },
      latencyMs: 100,
    })
    tracker.record({
      toolName: 'multi_ask',
      model: gpt,
      usage: { inputTokens: 100, outputTokens: 50 },
      latencyMs: 150,
    })

    const report = tracker.getReport()
    expect(report.totalRequests).toBe(2)
    expect(Object.keys(report.byModel)).toHaveLength(2)
    expect(Object.keys(report.byTool)).toHaveLength(2)
    expect(report.byModel['google/gemini-2.5-flash-lite']?.requests).toBe(1)
    expect(report.byTool['multi_ask']?.requests).toBe(1)
  })

  it('returns zero savings with no entries', () => {
    const tracker = makeTracker()
    const report = tracker.getReport()
    expect(report.totalRequests).toBe(0)
    expect(report.savingsPercent).toBe(0)
  })
})
