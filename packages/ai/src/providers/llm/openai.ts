import type { LLMProvider } from "../../types";

export const openaiLLMProvider: LLMProvider = {
  id: "openai",
  name: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  envKey: "OPENAI_API_KEY",
  models: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, default: true },
    { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000 },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1047576 },
    { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1047576 },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 1047576 },
    { id: "o3-mini", name: "o3 Mini", contextWindow: 200000 },
    { id: "o4-mini", name: "o4 Mini", contextWindow: 200000 },
  ],
};
