import type { LLMProvider } from "../../types";

export const xaiLLMProvider: LLMProvider = {
  id: "xai",
  name: "xAI",
  baseUrl: "https://api.x.ai/v1",
  envKey: "XAI_API_KEY",
  models: [
    { id: "grok-3-mini-fast", name: "Grok 3 Mini Fast", contextWindow: 131072, default: true },
    { id: "grok-3-mini", name: "Grok 3 Mini", contextWindow: 131072 },
    { id: "grok-3", name: "Grok 3", contextWindow: 131072 },
    { id: "grok-3-fast", name: "Grok 3 Fast", contextWindow: 131072 },
    { id: "grok-2-latest", name: "Grok 2", contextWindow: 131072 },
  ],
};
