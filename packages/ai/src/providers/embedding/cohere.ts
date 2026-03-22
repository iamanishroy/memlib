import type { EmbeddingProvider } from "../../types";

export const cohereEmbeddingProvider: EmbeddingProvider = {
  id: "cohere",
  name: "Cohere",
  baseUrl: "https://api.cohere.com/v2",
  envKey: "COHERE_API_KEY",
  models: [
    { id: "embed-v4.0", name: "Embed v4.0", dimensions: 1024, maxInput: 128000, default: true },
    { id: "embed-english-v3.0", name: "Embed English v3.0", dimensions: 1024, maxInput: 512 },
    { id: "embed-multilingual-v3.0", name: "Embed Multilingual v3.0", dimensions: 1024, maxInput: 512 },
    { id: "embed-english-light-v3.0", name: "Embed English Light v3.0", dimensions: 384, maxInput: 512 },
  ],
};
