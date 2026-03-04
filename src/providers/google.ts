import { GoogleGenerativeAI } from '@google/generative-ai'
import { BaseProvider } from './base.js'
import { MODEL_CATALOG } from '../pricing.js'
import type { ProviderName, ModelDef, GenerateRequest, GenerateResult } from '../types.js'

export class GoogleProvider extends BaseProvider {
  readonly name: ProviderName = 'google'
  private client: GoogleGenerativeAI | null = null

  constructor(private apiKey?: string) {
    super()
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(this.apiKey!)
    }
    return this.client
  }

  listModels(): ModelDef[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'google')
  }

  protected async generateRaw(req: GenerateRequest): Promise<GenerateResult> {
    const client = this.getClient()

    const model = client.getGenerativeModel({
      model: req.model,
      ...(req.systemPrompt && { systemInstruction: req.systemPrompt }),
      generationConfig: {
        ...(req.maxOutputTokens && { maxOutputTokens: req.maxOutputTokens }),
        ...(req.temperature !== undefined && { temperature: req.temperature }),
      },
    })

    // Build chat history from all but the last message
    const history = req.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : ('user' as const),
      parts: [{ text: m.content }],
    }))

    const lastMessage = req.messages[req.messages.length - 1]
    if (!lastMessage) {
      throw new Error('At least one message is required')
    }

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response

    const text = response.text()
    const usage = response.usageMetadata

    return {
      text,
      model: req.model,
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      },
      latencyMs: 0,
    }
  }
}
