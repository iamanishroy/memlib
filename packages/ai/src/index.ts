// ─── Types ───────────────────────────────────────────────────────
export type {
  LLMProvider,
  LLMModel,
  LLMConfig,
  EmbeddingProvider,
  EmbeddingModel,
  EmbeddingConfig,
  GenerateTextFn,
  GenerateEmbeddingFn,
} from "./types";

// ─── Factory Functions ───────────────────────────────────────────
export { createLLM, createEmbedding } from "./factory";

// ─── Registry (query & registration) ─────────────────────────────
export {
  // Static provider lists
  LLM_PROVIDERS,
  EMBEDDING_PROVIDERS,
  // Query functions
  getLLMProviders,
  getLLMProvider,
  getLLMModels,
  getEmbeddingProviders,
  getEmbeddingProvider,
  getEmbeddingModels,
  // Custom provider registration
  addCustomLLMProvider,
  addCustomEmbeddingProvider,
  // Config types for custom providers
  type CustomLLMProviderConfig,
  type CustomEmbeddingProviderConfig,
} from "./registry";

// ─── Logos ────────────────────────────────────────────────────────
export { PROVIDER_LOGOS } from "./logos";
