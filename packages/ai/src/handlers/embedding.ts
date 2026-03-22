/**
 * Shared fetch-based handlers for embedding generation.
 *
 * Most providers use the OpenAI embeddings format.
 * Gemini and Cohere have their own formats.
 */

import type { GenerateEmbeddingFn } from "../types";

// ─── OpenAI-compatible (/v1/embeddings) ──────────────────────────
// Works for: OpenAI, Mistral, Voyage, and any custom provider

export const openaiCompatibleEmbed: GenerateEmbeddingFn = async (
  text,
  apiKey,
  model,
  baseUrl,
  dimensions,
) => {
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      dimensions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const data = result["data"] as Array<Record<string, unknown>> | undefined;
  const embedding = data?.[0]?.["embedding"] as number[] | undefined;
  if (!embedding) {
    throw new Error("Failed to generate embedding: Invalid API response");
  }
  return embedding;
};

// ─── Google Gemini ───────────────────────────────────────────────

export const geminiEmbed: GenerateEmbeddingFn = async (
  text,
  apiKey,
  model,
  baseUrl,
  dimensions,
) => {
  const url = `${baseUrl}/models/${model}:embedContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      output_dimensionality: dimensions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Embedding API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const embedding = result["embedding"] as Record<string, unknown> | undefined;
  const values = embedding?.["values"] as number[] | undefined;
  if (!values) {
    throw new Error("Failed to generate embedding: Invalid Gemini response");
  }
  return values;
};

// ─── Cohere ──────────────────────────────────────────────────────

export const cohereEmbed: GenerateEmbeddingFn = async (
  text,
  apiKey,
  model,
  baseUrl,
  _dimensions,
) => {
  const response = await fetch(`${baseUrl}/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      texts: [text],
      input_type: "search_document",
      embedding_types: ["float"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cohere Embedding API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const embeddings = result["embeddings"] as Record<string, unknown> | undefined;
  const floatEmbeddings = embeddings?.["float"] as number[][] | undefined;
  const embedding = floatEmbeddings?.[0];
  if (!embedding) {
    throw new Error("Failed to generate embedding: Invalid Cohere response");
  }
  return embedding;
};
