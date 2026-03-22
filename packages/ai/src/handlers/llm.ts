/**
 * Shared fetch-based handlers for LLM text generation.
 *
 * Most providers use the OpenAI chat/completions format.
 * Gemini and Anthropic have their own formats.
 */

import type { GenerateTextFn } from "../types";

// ─── OpenAI-compatible (/v1/chat/completions) ────────────────────
// Works for: OpenAI, Mistral, Groq, xAI, Cohere, OpenRouter, and any custom provider

export const openaiCompatibleText: GenerateTextFn = async (
  prompt,
  apiKey,
  model,
  baseUrl,
  _options,
) => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const choices = result["choices"] as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.["message"] as Record<string, unknown> | undefined;
  const content = message?.["content"] as string | undefined;
  if (!content) {
    throw new Error("Failed to generate text: Invalid API response");
  }
  return content;
};

// ─── Google Gemini ───────────────────────────────────────────────

export const geminiText: GenerateTextFn = async (
  prompt,
  apiKey,
  model,
  baseUrl,
  options,
) => {
  const url = `${baseUrl}/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const candidates = result["candidates"] as Array<Record<string, unknown>> | undefined;
  const content = candidates?.[0]?.["content"] as Record<string, unknown> | undefined;
  const parts = content?.["parts"] as Array<Record<string, unknown>> | undefined;
  const text = parts?.[0]?.["text"] as string | undefined;
  if (!text) {
    throw new Error("Failed to generate text: Invalid Gemini response");
  }
  return text;
};

// ─── Anthropic ───────────────────────────────────────────────────

export const anthropicText: GenerateTextFn = async (
  prompt,
  apiKey,
  model,
  baseUrl,
  options,
) => {
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: options?.maxTokens ?? 1024,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature ?? 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const contentArray = result["content"] as Array<Record<string, unknown>> | undefined;
  const text = contentArray?.[0]?.["text"] as string | undefined;
  if (!text) {
    throw new Error("Failed to generate text: Invalid Anthropic response");
  }
  return text;
};
