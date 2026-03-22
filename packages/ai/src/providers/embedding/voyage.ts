import type { EmbeddingProvider } from "../../types";

export const voyageEmbeddingProvider: EmbeddingProvider = {
  id: "voyage",
  name: "Voyage AI",
  baseUrl: "https://api.voyageai.com/v1",
  envKey: "VOYAGE_API_KEY",
  models: [
    { id: "voyage-3", name: "Voyage 3", dimensions: 1024, maxInput: 32000, default: true },
    { id: "voyage-3-lite", name: "Voyage 3 Lite", dimensions: 512, maxInput: 32000 },
    { id: "voyage-code-3", name: "Voyage Code 3", dimensions: 1024, maxInput: 32000 },
  ],
};
