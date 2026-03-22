import type { LLMProvider } from "../../types";

export const geminiLLMProvider: LLMProvider = {
  id: "gemini",
  name: "Google Gemini",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  envKey: "GEMINI_API_KEY",
  models: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1048576, default: true },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1048576 },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1048576 },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextWindow: 1048576 },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1048576 },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2097152 },
  ],
};
