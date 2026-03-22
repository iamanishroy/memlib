// ─── LLM Types ───────────────────────────────────────────────────

export interface LLMModel {
  /** Model identifier, e.g. "gpt-4o-mini" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Context window in tokens (if known) */
  contextWindow?: number;
  /** Whether this is the default model for its provider */
  default?: boolean;
}

export interface LLMProvider {
  /** Provider identifier, e.g. "openai" */
  id: string;
  /** Human-readable name, e.g. "OpenAI" */
  name: string;
  /** Default base URL for API calls */
  baseUrl: string;
  /** Provider logo/favicon URL (injected by registry) */
  logo?: string;
  /** Environment variable name for the API key */
  envKey: string;
  /** Available models */
  models: LLMModel[];
}

export interface LLMConfig {
  /** Provider identifier (e.g. "openai", "gemini", "anthropic") */
  provider: string;
  /** API key for authentication */
  apiKey: string;
  /** Model to use (defaults to provider's default model) */
  model?: string;
  /** Override the default base URL */
  baseUrl?: string;
  /** Temperature (0-2, defaults to 0.1) */
  temperature?: number;
  /** Max output tokens (defaults to 1024) */
  maxTokens?: number;
}

// ─── Embedding Types ─────────────────────────────────────────────

export interface EmbeddingModel {
  /** Model identifier, e.g. "text-embedding-3-small" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Default output dimensions */
  dimensions: number;
  /** Max input tokens (if known) */
  maxInput?: number;
  /** Whether this is the default model for its provider */
  default?: boolean;
}

export interface EmbeddingProvider {
  /** Provider identifier, e.g. "openai" */
  id: string;
  /** Human-readable name, e.g. "OpenAI" */
  name: string;
  /** Default base URL for API calls */
  baseUrl: string;
  /** Provider logo/favicon URL (injected by registry) */
  logo?: string;
  /** Environment variable name for the API key */
  envKey: string;
  /** Available models */
  models: EmbeddingModel[];
}

export interface EmbeddingConfig {
  /** Provider identifier (e.g. "openai", "gemini") */
  provider: string;
  /** API key for authentication */
  apiKey: string;
  /** Model to use (defaults to provider's default model) */
  model?: string;
  /** Override default output dimensions */
  dimensions?: number;
  /** Override the default base URL */
  baseUrl?: string;
}

// ─── Provider Handler Types ──────────────────────────────────────

export type GenerateTextFn = (
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  options?: { temperature?: number; maxTokens?: number },
) => Promise<string>;

export type GenerateEmbeddingFn = (
  text: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  dimensions: number,
) => Promise<number[]>;
