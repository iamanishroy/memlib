import type { MemoryConfig } from "../config";

const GEMINI_EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

async function geminiEmbedding(
  text: string,
  apiKey: string,
  dimensions: number,
): Promise<number[]> {
  const response = await fetch(GEMINI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      output_dimensionality: dimensions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini Embedding API error (${response.status}): ${errorText}`,
    );
  }

  const result = (await response.json()) as any;
  if (!result.embedding?.values) {
    throw new Error("Failed to generate embedding: Invalid Gemini response");
  }
  return result.embedding.values;
}

async function openaiEmbedding(
  text: string,
  apiKey: string,
  dimensions: number,
): Promise<number[]> {
  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI Embedding API error (${response.status}): ${errorText}`,
    );
  }

  const result = (await response.json()) as any;
  if (!result.data?.[0]?.embedding) {
    throw new Error("Failed to generate embedding: Invalid OpenAI response");
  }
  return result.data[0].embedding;
}

export function createEmbeddingFn(config: MemoryConfig["embedding"]) {
  const dimensions = config.dimensions ?? 1536;

  return async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    switch (config.provider) {
      case "gemini":
        return geminiEmbedding(text, config.apiKey, dimensions);
      case "openai":
        return openaiEmbedding(text, config.apiKey, dimensions);
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  };
}
