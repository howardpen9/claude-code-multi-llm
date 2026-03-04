import OpenAI from 'openai'
import { BaseProvider } from './base.js'
import { MODEL_CATALOG } from '../pricing.js'
import type { ProviderName, ModelDef, GenerateRequest, GenerateResult } from '../types.js'

export class OpenAIProvider extends BaseProvider {
  readonly name: ProviderName = 'openai'
  private client: OpenAI | null = null

  constructor(
    private apiKey?: string,
    private baseUrl?: string,
  ) {
    super()
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey!,
        ...(this.baseUrl && { baseURL: this.baseUrl }),
      })
    }
    return this.client
  }

  listModels(): ModelDef[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'openai')
  }

  protected async generateRaw(req: GenerateRequest): Promise<GenerateResult> {
    const client = this.getClient()

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt })
    }
    for (const turn of req.messages) {
      messages.push({ role: turn.role, content: turn.content })
    }

    const response = await client.chat.completions.create({
      model: req.model,
      messages,
      ...(req.maxOutputTokens && { max_tokens: req.maxOutputTokens }),
      ...(req.temperature !== undefined && { temperature: req.temperature }),
    })

    const choice = response.choices[0]
    return {
      text: choice?.message?.content ?? '',
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      latencyMs: 0,
    }
  }
}
