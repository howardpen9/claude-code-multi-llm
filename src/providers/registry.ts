import type { AppConfig, LLMProvider, ModelDef, ProviderName } from '../types.js'
import { QualityTier, tierIndex } from '../types.js'
import { OpenAIProvider } from './openai.js'
import { GoogleProvider } from './google.js'
import { MODEL_CATALOG, findModel } from '../pricing.js'

export class ProviderRegistry {
  private providers = new Map<ProviderName, LLMProvider>()

  constructor(config: AppConfig) {
    if (config.providers.openai?.apiKey) {
      this.providers.set(
        'openai',
        new OpenAIProvider(config.providers.openai.apiKey, config.providers.openai.baseUrl),
      )
    }
    if (config.providers.google?.apiKey) {
      this.providers.set('google', new GoogleProvider(config.providers.google.apiKey))
    }
  }

  getProvider(name: ProviderName): LLMProvider {
    const provider = this.providers.get(name)
    if (!provider) throw new Error(`Provider "${name}" not configured`)
    return provider
  }

  hasProvider(name: ProviderName): boolean {
    return this.providers.has(name)
  }

  getConfiguredProviders(): ProviderName[] {
    return Array.from(this.providers.keys())
  }

  /** Get all models from configured providers at or above the given tier */
  getModelsForTier(minTier: QualityTier): ModelDef[] {
    const minIdx = tierIndex(minTier)
    return MODEL_CATALOG.filter(
      (m) => tierIndex(m.tier) >= minIdx && this.providers.has(m.provider),
    )
  }

  /** Get all models from configured providers */
  getAllModels(): ModelDef[] {
    return MODEL_CATALOG.filter((m) => this.providers.has(m.provider))
  }

  findModel(nameOrAlias: string): ModelDef | undefined {
    const model = findModel(nameOrAlias)
    if (model && this.providers.has(model.provider)) return model
    return undefined
  }
}
