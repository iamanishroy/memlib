import type {
  LLMProvider,
  LLMModel,
  EmbeddingProvider,
  EmbeddingModel,
  GenerateTextFn,
  GenerateEmbeddingFn,
} from "./types";
import { PROVIDER_LOGOS } from "./logos";

// ─── Shared Handlers ─────────────────────────────────────────────

import {
  openaiCompatibleText,
  geminiText,
  anthropicText,
} from "./handlers/llm";
import {
  openaiCompatibleEmbed,
  geminiEmbed,
  cohereEmbed,
} from "./handlers/embedding";

// ─── Provider Metadata ───────────────────────────────────────────
// Each provider file now only exports { id, name, baseUrl, envKey, models }

import { geminiLLMProvider } from "./providers/llm/gemini";
import { openaiLLMProvider } from "./providers/llm/openai";
import { anthropicLLMProvider } from "./providers/llm/anthropic";
import { mistralLLMProvider } from "./providers/llm/mistral";
import { groqLLMProvider } from "./providers/llm/groq";
import { xaiLLMProvider } from "./providers/llm/xai";
import { cohereLLMProvider } from "./providers/llm/cohere";
import { openrouterLLMProvider } from "./providers/llm/openrouter";

import { geminiEmbeddingProvider } from "./providers/embedding/gemini";
import { openaiEmbeddingProvider } from "./providers/embedding/openai";
import { cohereEmbeddingProvider } from "./providers/embedding/cohere";
import { mistralEmbeddingProvider } from "./providers/embedding/mistral";
import { voyageEmbeddingProvider } from "./providers/embedding/voyage";

// ─── Inject Logos ────────────────────────────────────────────────

function withLogo<T extends { id: string }>(
  provider: T,
): T & { logo: string } {
  return { ...provider, logo: PROVIDER_LOGOS[provider.id] ?? PROVIDER_LOGOS["custom"]! };
}

// ─── Built-in Registries ─────────────────────────────────────────

const _builtinLLMProviders: LLMProvider[] = [
  withLogo(geminiLLMProvider),
  withLogo(openaiLLMProvider),
  withLogo(anthropicLLMProvider),
  withLogo(mistralLLMProvider),
  withLogo(groqLLMProvider),
  withLogo(xaiLLMProvider),
  withLogo(cohereLLMProvider),
  withLogo(openrouterLLMProvider),
];

const _builtinEmbeddingProviders: EmbeddingProvider[] = [
  withLogo(geminiEmbeddingProvider),
  withLogo(openaiEmbeddingProvider),
  withLogo(cohereEmbeddingProvider),
  withLogo(mistralEmbeddingProvider),
  withLogo(voyageEmbeddingProvider),
];

// ─── Handler Maps ────────────────────────────────────────────────
// Map provider IDs to the correct fetch handler based on API format

const _llmHandlers = new Map<string, GenerateTextFn>([
  ["gemini", geminiText],
  ["openai", openaiCompatibleText],
  ["anthropic", anthropicText],
  // All OpenAI-compatible providers
  ["mistral", openaiCompatibleText],
  ["groq", openaiCompatibleText],
  ["xai", openaiCompatibleText],
  ["cohere", openaiCompatibleText],
  ["openrouter", openaiCompatibleText],
  ["custom", openaiCompatibleText],
]);

const _embeddingHandlers = new Map<string, GenerateEmbeddingFn>([
  ["gemini", geminiEmbed],
  ["openai", openaiCompatibleEmbed],
  ["cohere", cohereEmbed],
  // All OpenAI-compatible embedding providers
  ["mistral", openaiCompatibleEmbed],
  ["voyage", openaiCompatibleEmbed],
  ["custom", openaiCompatibleEmbed],
]);

// ─── Mutable Custom Registries ───────────────────────────────────

const _customLLMProviders: LLMProvider[] = [];
const _customEmbeddingProviders: EmbeddingProvider[] = [];

// ─── Public API ──────────────────────────────────────────────────

/** All registered LLM providers (built-in + custom) */
export function getLLMProviders(): LLMProvider[] {
  return [..._builtinLLMProviders, ..._customLLMProviders];
}

/** All registered embedding providers (built-in + custom) */
export function getEmbeddingProviders(): EmbeddingProvider[] {
  return [..._builtinEmbeddingProviders, ..._customEmbeddingProviders];
}

/** Get a specific LLM provider by ID */
export function getLLMProvider(id: string): LLMProvider | undefined {
  return getLLMProviders().find((p) => p.id === id);
}

/** Get a specific embedding provider by ID */
export function getEmbeddingProvider(id: string): EmbeddingProvider | undefined {
  return getEmbeddingProviders().find((p) => p.id === id);
}

/** Get all models for a specific LLM provider */
export function getLLMModels(providerId: string): LLMModel[] {
  return getLLMProvider(providerId)?.models ?? [];
}

/** Get all models for a specific embedding provider */
export function getEmbeddingModels(providerId: string): EmbeddingModel[] {
  return getEmbeddingProvider(providerId)?.models ?? [];
}

/** Get the text generation handler for a provider */
export function getLLMHandler(providerId: string): GenerateTextFn | undefined {
  return _llmHandlers.get(providerId);
}

/** Get the embedding handler for a provider */
export function getEmbeddingHandler(
  providerId: string,
): GenerateEmbeddingFn | undefined {
  return _embeddingHandlers.get(providerId);
}

// ─── Custom Provider Registration ────────────────────────────────

export interface CustomLLMProviderConfig {
  /** Unique provider ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Base URL for the OpenAI-compatible API */
  baseUrl: string;
  /** Environment variable name for API key */
  envKey?: string;
  /** Optional logo/favicon URL */
  logo?: string;
  /** Models available from this provider */
  models?: LLMModel[];
}

export interface CustomEmbeddingProviderConfig {
  /** Unique provider ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Base URL for the OpenAI-compatible API */
  baseUrl: string;
  /** Environment variable name for API key */
  envKey?: string;
  /** Optional logo/favicon URL */
  logo?: string;
  /** Models available from this provider */
  models?: EmbeddingModel[];
}

/**
 * Register a custom OpenAI-compatible LLM provider.
 * Uses the OpenAI chat/completions handler by default.
 */
export function addCustomLLMProvider(
  config: CustomLLMProviderConfig,
  handler?: GenerateTextFn,
): void {
  const provider: LLMProvider = {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    logo: config.logo ?? PROVIDER_LOGOS["custom"]!,
    envKey: config.envKey ?? "",
    models: config.models ?? [],
  };

  _customLLMProviders.push(provider);
  _llmHandlers.set(config.id, handler ?? openaiCompatibleText);
}

/**
 * Register a custom OpenAI-compatible embedding provider.
 * Uses the OpenAI embeddings handler by default.
 */
export function addCustomEmbeddingProvider(
  config: CustomEmbeddingProviderConfig,
  handler?: GenerateEmbeddingFn,
): void {
  const provider: EmbeddingProvider = {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    logo: config.logo ?? PROVIDER_LOGOS["custom"]!,
    envKey: config.envKey ?? "",
    models: config.models ?? [],
  };

  _customEmbeddingProviders.push(provider);
  _embeddingHandlers.set(config.id, handler ?? openaiCompatibleEmbed);
}

// ─── Static Exports (for convenience) ────────────────────────────

/** All built-in LLM providers */
export const LLM_PROVIDERS = _builtinLLMProviders;

/** All built-in embedding providers */
export const EMBEDDING_PROVIDERS = _builtinEmbeddingProviders;
