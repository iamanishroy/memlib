import type { EmbeddingProvider } from "../../types";

export const openaiEmbeddingProvider: EmbeddingProvider = {
  id: "openai",
  name: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  envKey: "OPENAI_API_KEY",
  models: [
    { id: "text-embedding-3-small", name: "Text Embedding 3 Small", dimensions: 1536, maxInput: 8191, default: true },
    { id: "text-embedding-3-large", name: "Text Embedding 3 Large", dimensions: 3072, maxInput: 8191 },
    { id: "text-embedding-ada-002", name: "Ada 002", dimensions: 1536, maxInput: 8191 },
  ],
};
