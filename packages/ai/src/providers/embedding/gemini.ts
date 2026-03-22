import type { EmbeddingProvider } from "../../types";

export const geminiEmbeddingProvider: EmbeddingProvider = {
  id: "gemini",
  name: "Google Gemini",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  envKey: "GEMINI_API_KEY",
  models: [
    { id: "gemini-embedding-001", name: "Gemini Embedding 001", dimensions: 768, maxInput: 2048, default: true },
    { id: "text-embedding-004", name: "Text Embedding 004", dimensions: 768, maxInput: 2048 },
  ],
};
