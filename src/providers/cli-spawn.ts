import { spawn } from 'node:child_process'
import { BaseProvider } from './base.js'
import { MODEL_CATALOG } from '../pricing.js'
import type { ProviderName, ModelDef, GenerateRequest, GenerateResult } from '../types.js'

/**
 * CLI-based provider that spawns external coding CLIs in non-interactive mode.
 * Uses SUBSCRIPTION credits (not API credits), so it's effectively free
 * if the user already pays for ChatGPT Pro, Google AI Studio, etc.
 *
 * Trade-offs vs API providers:
 * - ✅ Uses subscription credits (no extra cost)
 * - ✅ No API key needed (CLI handles auth)
 * - ⚠️ Slower (process spawn + CLI init overhead)
 * - ⚠️ No token counting (CLI outputs plain text, no usage metadata)
 * - ⚠️ Requires CLI to be installed
 */

export interface CLIDef {
  name: string
  /** Command to check if CLI exists */
  detectCmd: string[]
  /** Build the non-interactive command. Prompt is passed via this function. */
  buildCmd: (prompt: string) => string[]
  /** Map to a provider name for cost tracking (costs are $0 for subscription) */
  provider: ProviderName
  /** Rough estimate of model tier */
  modelId: string
  /** Timeout in ms */
  timeoutMs: number
}

export const CLI_REGISTRY: CLIDef[] = [
  {
    name: 'codex',
    detectCmd: ['which', 'codex'],
    buildCmd: (prompt) => ['codex', 'exec', prompt],
    provider: 'openai',
    modelId: 'cli/codex',
    timeoutMs: 120_000,
  },
  {
    name: 'gemini',
    detectCmd: ['which', 'gemini'],
    buildCmd: (prompt) => ['gemini', '-p', prompt],
    provider: 'google',
    modelId: 'cli/gemini',
    timeoutMs: 120_000,
  },
  {
    name: 'kimi',
    detectCmd: ['sh', '-c', 'which kimi 2>/dev/null || ls ~/.local/bin/kimi 2>/dev/null'],
    buildCmd: (prompt) => {
      // Kimi may be installed at ~/.local/bin/kimi
      const bin = process.env.KIMI_BIN || 'kimi'
      return [bin, '-p', prompt, '--print', '--final-message-only']
    },
    provider: 'google', // placeholder — kimi is moonshot but not in our ProviderName yet
    modelId: 'cli/kimi',
    timeoutMs: 120_000,
  },
]

/** Check which CLIs are installed */
export async function detectAvailableCLIs(): Promise<CLIDef[]> {
  const results = await Promise.allSettled(
    CLI_REGISTRY.map(async (cli) => {
      const ok = await runCommand(cli.detectCmd, 5_000)
      return ok ? cli : null
    }),
  )
  return results
    .filter((r): r is PromiseFulfilledResult<CLIDef> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}

/** Spawn a CLI and capture stdout */
export function spawnCLI(
  cli: CLIDef,
  prompt: string,
): Promise<{ text: string; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const args = cli.buildCmd(prompt)
    const cmd = args[0]!
    const cmdArgs = args.slice(1)

    const proc = spawn(cmd, cmdArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: cli.timeoutMs,
      env: { ...process.env, NO_COLOR: '1' }, // disable color codes in output
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      const latencyMs = Date.now() - start
      if (code === 0) {
        resolve({ text: stdout.trim(), latencyMs })
      } else {
        reject(new Error(`${cli.name} exited with code ${code}: ${stderr.trim()}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ${cli.name}: ${err.message}`))
    })

    // Close stdin immediately — non-interactive mode
    proc.stdin.end()
  })
}

async function runCommand(args: string[], timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(args[0]!, args.slice(1), {
      stdio: 'ignore',
      timeout: timeoutMs,
    })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}
