import type { LLMProvider } from "../../types";

export const groqLLMProvider: LLMProvider = {
  id: "groq",
  name: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  envKey: "GROQ_API_KEY",
  models: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, default: true },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextWindow: 128000 },
    { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8192 },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768 },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", contextWindow: 131072 },
  ],
};
