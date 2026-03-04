import { describe, it, expect } from 'vitest'
import { classifyTask, selectModel, route } from '../src/router.js'
import { QualityTier } from '../src/types.js'
import { MODEL_CATALOG } from '../src/pricing.js'

describe('classifyTask', () => {
  it('classifies translation as BASIC', () => {
    expect(classifyTask('translate this to Japanese')).toBe(QualityTier.BASIC)
  })

  it('classifies formatting as BASIC', () => {
    expect(classifyTask('format this JSON')).toBe(QualityTier.BASIC)
  })

  it('classifies summarization as BASIC', () => {
    expect(classifyTask('summarize the key points')).toBe(QualityTier.BASIC)
  })

  it('classifies short prompts as BASIC', () => {
    expect(classifyTask('what is 2+2?')).toBe(QualityTier.BASIC)
  })

  it('classifies code review as ADVANCED', () => {
    expect(classifyTask('review this code for bugs and edge cases')).toBe(QualityTier.ADVANCED)
  })

  it('classifies architecture decisions as ADVANCED', () => {
    expect(classifyTask('should we use Redis or in-memory LRU?')).toBe(QualityTier.ADVANCED)
  })

  it('classifies security questions as ADVANCED', () => {
    expect(classifyTask('check for security vulnerabilities in auth')).toBe(QualityTier.ADVANCED)
  })

  it('downgrades ADVANCED to STANDARD with simplicity signals', () => {
    expect(classifyTask('just quickly review this simple change')).toBe(QualityTier.STANDARD)
  })

  it('classifies deep reasoning as FRONTIER', () => {
    expect(classifyTask('deep reasoning about this novel algorithm')).toBe(QualityTier.FRONTIER)
  })

  it('classifies medium-length generic prompts as STANDARD', () => {
    const prompt =
      'How does the event loop work in Node.js? Please explain the different phases including timers, pending callbacks, poll, check, and close callbacks. Give concrete code examples for each phase.'
    expect(classifyTask(prompt)).toBe(QualityTier.STANDARD)
  })

  it('classifies long prompts as ADVANCED', () => {
    const prompt = 'x '.repeat(1100) // > 2000 chars
    expect(classifyTask(prompt)).toBe(QualityTier.ADVANCED)
  })

  it('respects forceTier override', () => {
    expect(classifyTask('hello', { forceTier: QualityTier.FRONTIER })).toBe(QualityTier.FRONTIER)
  })
})

describe('selectModel', () => {
  const allModels = MODEL_CATALOG

  it('picks cheapest model by weighted cost', () => {
    const decision = selectModel(allModels)
    expect(decision).not.toBeNull()
    // Gemini Flash-Lite should be cheapest: $0.10 + 3*$0.40 = $1.30
    expect(decision!.model.id).toBe('google/gemini-2.5-flash-lite')
  })

  it('respects preferred provider as tiebreaker', () => {
    // With only similarly-priced models, prefer openai
    const decision = selectModel(allModels, { preferredProvider: 'openai' })
    expect(decision).not.toBeNull()
    // Still picks cheapest overall (google flash-lite)
    expect(decision!.model.id).toBe('google/gemini-2.5-flash-lite')
  })

  it('returns null for empty candidates', () => {
    expect(selectModel([])).toBeNull()
  })

  it('includes alternatives', () => {
    const decision = selectModel(allModels)
    expect(decision!.alternatives.length).toBeGreaterThan(0)
  })
})

describe('route', () => {
  const allModels = MODEL_CATALOG

  it('routes simple prompts to cheapest BASIC+ model', () => {
    const result = route(allModels, 'translate to Spanish')
    expect(result).not.toBeNull()
    expect(result!.classifiedTier).toBe(QualityTier.BASIC)
    // Should pick cheapest model (all models are >= BASIC)
    expect(result!.decision.model.id).toBe('google/gemini-2.5-flash-lite')
  })

  it('routes code review to ADVANCED+ model', () => {
    const result = route(allModels, 'review this code for security issues')
    expect(result).not.toBeNull()
    expect(result!.classifiedTier).toBe(QualityTier.ADVANCED)
    // Should pick cheapest ADVANCED+ model (Gemini Flash: $0.15 + 3*$0.60 = $1.95)
    expect(result!.decision.model.id).toBe('google/gemini-2.5-flash')
  })

  it('respects forceTier', () => {
    const result = route(allModels, 'hello', { forceTier: QualityTier.FRONTIER })
    expect(result).not.toBeNull()
    expect(result!.classifiedTier).toBe(QualityTier.FRONTIER)
    // o3-mini: $1.10 + 3*$4.40 = $14.30 vs GPT-5: $2.50 + 3*$15 = $47.50
    expect(result!.decision.model.id).toBe('openai/o3-mini')
  })
})
