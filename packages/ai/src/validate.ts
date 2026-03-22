/**
 * Lightweight API-key validation helpers.
 *
 * Each function makes a minimal API call to verify the key works.
 * Returns { valid: true } or { valid: false, error: string }.
 */

import {
  getLLMHandler,
  getLLMProvider,
  getEmbeddingHandler,
  getEmbeddingProvider,
} from "./registry";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an LLM API key by making a tiny generateText call.
 */
export async function validateLLMApiKey(
  provider: string,
  apiKey: string,
  model?: string,
  baseUrl?: string,
): Promise<ValidationResult> {
  const handler = getLLMHandler(provider);
  if (!handler) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }

  const providerInfo = getLLMProvider(provider);
  const resolvedModel =
    model ||
    providerInfo?.models.find((m) => m.default)?.id ||
    providerInfo?.models[0]?.id ||
    "";
  const resolvedBaseUrl = baseUrl || providerInfo?.baseUrl || "";

  try {
    await handler("Say hi", apiKey, resolvedModel, resolvedBaseUrl);
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Check for common auth error patterns
    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("Unauthorized") ||
      message.includes("Invalid API Key") ||
      message.includes("invalid_api_key")
    ) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: false, error: message };
  }
}

/**
 * Validate an embedding API key by embedding a single word.
 */
export async function validateEmbeddingApiKey(
  provider: string,
  apiKey: string,
  model?: string,
  baseUrl?: string,
): Promise<ValidationResult> {
  const handler = getEmbeddingHandler(provider);
  if (!handler) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }

  const providerInfo = getEmbeddingProvider(provider);
  const defaultModel =
    providerInfo?.models.find((m) => m.default) || providerInfo?.models[0];
  const resolvedModel = model || defaultModel?.id || "";
  const resolvedBaseUrl = baseUrl || providerInfo?.baseUrl || "";
  const dimensions = defaultModel?.dimensions || 1536;

  try {
    const result = await handler(
      "test",
      apiKey,
      resolvedModel,
      resolvedBaseUrl,
      dimensions,
    );
    if (!Array.isArray(result) || result.length === 0) {
      return {
        valid: false,
        error: "Unexpected response: no embedding returned",
      };
    }
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("Unauthorized") ||
      message.includes("Invalid API Key") ||
      message.includes("invalid_api_key")
    ) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: false, error: message };
  }
}
