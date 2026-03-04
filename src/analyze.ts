#!/usr/bin/env node
/**
 * Analyze MCP tool usage from cost-tracker and hooks logs.
 * Usage: npx tsx src/analyze.ts [--hooks-log path] [--cost-log path]
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const DEFAULT_COST_LOG = path.join(os.homedir(), '.llm-router', 'cost-log.jsonl')
const DEFAULT_HOOKS_LOG = path.join(os.homedir(), '.llm-router', 'hooks-log.jsonl')

interface CostEntry {
  timestamp: number
  toolName: string
  model: string
  tier: string
  classifiedTier?: string
  promptExcerpt?: string
  usage: { inputTokens: number; outputTokens: number }
  costUsd: number
  baselineCostUsd: number
  latencyMs: number
}

interface HookEntry {
  ts: string
  event: 'pre' | 'post'
  session: string
  tool: string
  prompt_excerpt?: string
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as T
      } catch {
        return null
      }
    })
    .filter((x): x is T => x !== null)
}

function formatUsd(n: number): string {
  return `$${n.toFixed(6)}`
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

function relativeTime(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

// --- Main ---

const args = process.argv.slice(2)
const costLogPath = args.includes('--cost-log') ? args[args.indexOf('--cost-log') + 1]! : DEFAULT_COST_LOG
const hooksLogPath = args.includes('--hooks-log')
  ? args[args.indexOf('--hooks-log') + 1]!
  : DEFAULT_HOOKS_LOG

console.log('=== Multi-LLM Toolkit Usage Report ===\n')

// --- Cost tracker data ---
const costEntries = readJsonl<CostEntry>(costLogPath)
console.log(`Cost log: ${costLogPath} (${costEntries.length} entries)`)

// --- Hooks data ---
const hookEntries = readJsonl<HookEntry>(hooksLogPath)
console.log(`Hooks log: ${hooksLogPath} (${hookEntries.length} entries)`)
console.log()

if (costEntries.length === 0 && hookEntries.length === 0) {
  console.log('No data yet. Use the toolkit in a Claude Code session to start collecting data.')
  console.log('\nSetup checklist:')
  console.log('  1. MCP server connected? → Check .mcp.json in your project')
  console.log('  2. Hooks installed? → Copy hooks/settings.json to .claude/settings.json')
  console.log('  3. Use ask/cli_ask/multi_ask in a Claude Code session')
  process.exit(0)
}

// === Section 1: Cost Summary ===
if (costEntries.length > 0) {
  const totalCost = costEntries.reduce((s, e) => s + e.costUsd, 0)
  const totalBaseline = costEntries.reduce((s, e) => s + e.baselineCostUsd, 0)
  const savings = totalBaseline - totalCost
  const savingsPercent = totalBaseline > 0 ? (savings / totalBaseline) * 100 : 0

  const oldest = costEntries[0]!
  const newest = costEntries[costEntries.length - 1]!

  console.log('## Cost Summary')
  console.log(`  Requests:     ${costEntries.length}`)
  console.log(`  Actual cost:  ${formatUsd(totalCost)}`)
  console.log(`  Opus baseline: ${formatUsd(totalBaseline)}`)
  console.log(`  Saved:        ${formatUsd(savings)} (${formatPercent(savingsPercent)})`)
  console.log(`  Period:       ${new Date(oldest.timestamp).toLocaleDateString()} — ${new Date(newest.timestamp).toLocaleDateString()}`)
  console.log()

  // By tool
  const byTool = new Map<string, { count: number; cost: number }>()
  for (const e of costEntries) {
    const prev = byTool.get(e.toolName) ?? { count: 0, cost: 0 }
    byTool.set(e.toolName, { count: prev.count + 1, cost: prev.cost + e.costUsd })
  }
  console.log('## By Tool')
  for (const [tool, data] of byTool) {
    console.log(`  ${tool.padEnd(15)} ${String(data.count).padStart(4)} calls  ${formatUsd(data.cost)}`)
  }
  console.log()

  // By model
  const byModel = new Map<string, { count: number; cost: number }>()
  for (const e of costEntries) {
    const prev = byModel.get(e.model) ?? { count: 0, cost: 0 }
    byModel.set(e.model, { count: prev.count + 1, cost: prev.cost + e.costUsd })
  }
  console.log('## By Model')
  for (const [model, data] of byModel) {
    console.log(`  ${model.padEnd(30)} ${String(data.count).padStart(4)} calls  ${formatUsd(data.cost)}`)
  }
  console.log()

  // By classified tier
  const byTier = new Map<string, number>()
  for (const e of costEntries) {
    const tier = e.classifiedTier ?? e.tier
    byTier.set(tier, (byTier.get(tier) ?? 0) + 1)
  }
  console.log('## Tier Distribution')
  for (const [tier, count] of byTier) {
    const pct = ((count / costEntries.length) * 100).toFixed(1)
    const bar = '#'.repeat(Math.round((count / costEntries.length) * 30))
    console.log(`  ${tier.padEnd(12)} ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${bar}`)
  }
  console.log()

  // Recent prompts
  const withPrompts = costEntries.filter((e) => e.promptExcerpt)
  if (withPrompts.length > 0) {
    console.log('## Recent Prompts (last 10)')
    const recent = withPrompts.slice(-10)
    for (const e of recent) {
      const ago = relativeTime(Date.now() - e.timestamp)
      const excerpt = e.promptExcerpt!.replace(/\n/g, ' ').slice(0, 80)
      console.log(`  [${e.classifiedTier ?? e.tier}] ${excerpt}...  (${e.model}, ${ago})`)
    }
    console.log()
  }
}

// === Section 2: Hooks Analysis ===
if (hookEntries.length > 0) {
  const preCalls = hookEntries.filter((e) => e.event === 'pre')
  const sessions = new Set(hookEntries.map((e) => e.session).filter(Boolean))

  console.log('## Hooks Analysis (Claude Code behavior)')
  console.log(`  Total MCP tool calls: ${preCalls.length}`)
  console.log(`  Unique sessions:      ${sessions.size}`)

  // Tool call frequency from hooks
  const hookByTool = new Map<string, number>()
  for (const e of preCalls) {
    const toolShort = e.tool.replace('mcp__multi-llm__', '')
    hookByTool.set(toolShort, (hookByTool.get(toolShort) ?? 0) + 1)
  }
  console.log('\n  Tool call frequency (from Claude Code side):')
  for (const [tool, count] of [...hookByTool].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${tool.padEnd(15)} ${count} calls`)
  }

  // Calls per session
  const callsPerSession = new Map<string, number>()
  for (const e of preCalls) {
    if (e.session) {
      callsPerSession.set(e.session, (callsPerSession.get(e.session) ?? 0) + 1)
    }
  }
  if (callsPerSession.size > 0) {
    const counts = [...callsPerSession.values()]
    const avg = counts.reduce((s, c) => s + c, 0) / counts.length
    const max = Math.max(...counts)
    console.log(`\n  Avg calls/session: ${avg.toFixed(1)}`)
    console.log(`  Max calls/session: ${max}`)
  }
  console.log()
}

// === Section 3: Key Questions ===
console.log('## Key Questions Status')

if (hookEntries.length > 0) {
  const preCalls = hookEntries.filter((e) => e.event === 'pre')
  console.log(`  Q1: Does Claude actually call our tools?  → YES (${preCalls.length} calls observed)`)
} else {
  console.log('  Q1: Does Claude actually call our tools?  → NO DATA (install hooks first)')
}

if (costEntries.length > 0) {
  const totalCost = costEntries.reduce((s, e) => s + e.costUsd, 0)
  const totalBaseline = costEntries.reduce((s, e) => s + e.baselineCostUsd, 0)
  const pct = totalBaseline > 0 ? ((1 - totalCost / totalBaseline) * 100).toFixed(1) : '?'
  console.log(`  Q2: Real savings?                         → ${pct}% (${costEntries.length} requests)`)
} else {
  console.log('  Q2: Real savings?                         → NO DATA')
}

const withTier = costEntries.filter((e) => e.classifiedTier)
if (withTier.length > 0) {
  const misrouted = withTier.filter((e) => e.classifiedTier !== e.tier)
  const pct = ((misrouted.length / withTier.length) * 100).toFixed(1)
  console.log(`  Q3: Router accuracy?                      → ${pct}% tier mismatch (${misrouted.length}/${withTier.length})`)
} else {
  console.log('  Q3: Router accuracy?                      → NO DATA (need classifiedTier in logs)')
}

console.log()
console.log('---')
console.log('Run again after more sessions to see trends.')
console.log(`Logs: ${costLogPath}`)
console.log(`       ${hooksLogPath}`)
