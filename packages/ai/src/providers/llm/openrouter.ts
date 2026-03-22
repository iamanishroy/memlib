import type { LLMProvider } from "../../types";

export const openrouterLLMProvider: LLMProvider = {
  id: "openrouter",
  name: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",
  envKey: "OPENROUTER_API_KEY",
  models: [
    { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash (via OpenRouter)", contextWindow: 1048576, default: true },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OpenRouter)", contextWindow: 200000 },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (via OpenRouter)", contextWindow: 128000 },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B (via OpenRouter)", contextWindow: 128000 },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (via OpenRouter)", contextWindow: 163840 },
    { id: "mistralai/mistral-large", name: "Mistral Large (via OpenRouter)", contextWindow: 128000 },
  ],
};
