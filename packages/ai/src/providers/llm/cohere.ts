import type { LLMProvider } from "../../types";

export const cohereLLMProvider: LLMProvider = {
  id: "cohere",
  name: "Cohere",
  baseUrl: "https://api.cohere.com/v2",
  envKey: "COHERE_API_KEY",
  models: [
    { id: "command-r", name: "Command R", contextWindow: 128000, default: true },
    { id: "command-r-plus", name: "Command R+", contextWindow: 128000 },
    { id: "command-r7b-12-2024", name: "Command R 7B", contextWindow: 128000 },
    { id: "command-a-03-2025", name: "Command A", contextWindow: 256000 },
  ],
};
