import type { LLMProvider } from "../../types";

export const mistralLLMProvider: LLMProvider = {
  id: "mistral",
  name: "Mistral",
  baseUrl: "https://api.mistral.ai/v1",
  envKey: "MISTRAL_API_KEY",
  models: [
    { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 32000, default: true },
    { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 32000 },
    { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000 },
    { id: "devstral-small-latest", name: "Devstral Small", contextWindow: 128000 },
    { id: "codestral-latest", name: "Codestral", contextWindow: 256000 },
  ],
};
