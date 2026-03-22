import type { LLMConfig, EmbeddingConfig } from "./types";
import {
  getLLMProvider,
  getLLMHandler,
  getEmbeddingProvider,
  getEmbeddingHandler,
} from "./registry";

/**
 * Create an LLM text generation function from config.
 *
 * @example
 * ```ts
 * const generateText = createLLM({
 *   provider: "openai",
 *   apiKey: "sk-...",
 *   model: "gpt-4o-mini",
 * });
 * const answer = await generateText("What is 2+2?");
 * ```
 */
export function createLLM(
  config: LLMConfig,
): (prompt: string) => Promise<string> {
  const provider = getLLMProvider(config.provider);
  const handler = getLLMHandler(config.provider);

  if (!handler) {
    throw new Error(
      `Unsupported LLM provider: "${config.provider}". ` +
        `Use addCustomLLMProvider() to register custom providers.`,
    );
  }

  // Resolve model: explicit > provider default > first model
  const defaultModel = provider?.models.find((m) => m.default)?.id
    ?? provider?.models[0]?.id
    ?? "";
  const model = config.model ?? defaultModel;
  const baseUrl = config.baseUrl ?? provider?.baseUrl ?? "";
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  return async function generateText(prompt: string): Promise<string> {
    return handler(prompt, config.apiKey, model, baseUrl, {
      temperature,
      maxTokens,
    });
  };
}

/**
 * Create an embedding generation function from config.
 *
 * @example
 * ```ts
 * const generateEmbedding = createEmbedding({
 *   provider: "openai",
 *   apiKey: "sk-...",
 *   dimensions: 1536,
 * });
 * const vector = await generateEmbedding("Hello world");
 * ```
 */
export function createEmbedding(
  config: EmbeddingConfig,
): (text: string) => Promise<number[]> {
  const provider = getEmbeddingProvider(config.provider);
  const handler = getEmbeddingHandler(config.provider);

  if (!handler) {
    throw new Error(
      `Unsupported embedding provider: "${config.provider}". ` +
        `Use addCustomEmbeddingProvider() to register custom providers.`,
    );
  }

  // Resolve model: explicit > provider default > first model
  const defaultModel = provider?.models.find((m) => m.default)?.id
    ?? provider?.models[0]?.id
    ?? "";
  const model = config.model ?? defaultModel;
  const baseUrl = config.baseUrl ?? provider?.baseUrl ?? "";

  // Resolve dimensions: explicit > model default > 1536
  const defaultDimensions = provider?.models.find((m) => m.id === model)?.dimensions
    ?? provider?.models.find((m) => m.default)?.dimensions
    ?? 1536;
  const dimensions = config.dimensions ?? defaultDimensions;

  return async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }
    return handler(text, config.apiKey, model, baseUrl, dimensions);
  };
}
