import type { LLMProvider } from "../../types";

export const anthropicLLMProvider: LLMProvider = {
  id: "anthropic",
  name: "Anthropic",
  baseUrl: "https://api.anthropic.com/v1",
  envKey: "ANTHROPIC_API_KEY",
  models: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, default: true },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", contextWindow: 200000 },
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", contextWindow: 200000 },
    { id: "claude-3-opus-latest", name: "Claude 3 Opus", contextWindow: 200000 },
  ],
};
