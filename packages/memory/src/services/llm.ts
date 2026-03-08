import type { MemoryConfig } from "../config";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

async function geminiText(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const url = GEMINI_URL.replace("{model}", model);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function openaiText(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  const text = result.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI returned empty response");
  return text;
}

async function anthropicText(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  const text = result.content?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("Anthropic returned empty response");
  return text;
}

export function createTextFn(config: MemoryConfig["llm"]) {
  const model = config.model ?? DEFAULT_MODELS[config.provider] ?? "";

  return async function generateText(prompt: string): Promise<string> {
    switch (config.provider) {
      case "gemini":
        return geminiText(prompt, config.apiKey, model);
      case "openai":
        return openaiText(prompt, config.apiKey, model);
      case "anthropic":
        return anthropicText(prompt, config.apiKey, model);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  };
}
