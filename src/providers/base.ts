import type { LLMProvider, ProviderName, ModelDef, GenerateRequest, GenerateResult } from '../types.js'

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderName,
    message: string,
    public readonly status?: number,
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'ProviderError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode
  return status === 429 || status === 500 || status === 503
}

export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: ProviderName
  abstract isConfigured(): boolean
  abstract listModels(): ModelDef[]
  protected abstract generateRaw(request: GenerateRequest): Promise<GenerateResult>

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const start = Date.now()
    try {
      const result = await this.withRetry(() => this.generateRaw(request))
      result.latencyMs = Date.now() - start
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status
      throw new ProviderError(this.name, msg, status)
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn()
      } catch (err: unknown) {
        if (i === maxRetries || !isRetryable(err)) throw err
        await sleep(1000 * (i + 1))
      }
    }
    throw new Error('unreachable')
  }
}
