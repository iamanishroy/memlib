import type { EmbeddingProvider } from "../../types";

export const mistralEmbeddingProvider: EmbeddingProvider = {
  id: "mistral",
  name: "Mistral",
  baseUrl: "https://api.mistral.ai/v1",
  envKey: "MISTRAL_API_KEY",
  models: [
    { id: "mistral-embed", name: "Mistral Embed", dimensions: 1024, maxInput: 8192, default: true },
  ],
};
