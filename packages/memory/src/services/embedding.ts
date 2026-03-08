export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Please set GEMINI_API_KEY in .env file",
    );
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text }],
        },
        output_dimensionality: 1536,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini Embedding API returned error (${response.status}): ${errorText}`,
      );
    }

    const result = (await response.json()) as any;

    if (!result.embedding || !result.embedding.values) {
      throw new Error(
        "Failed to generate embedding: Invalid response from Gemini",
      );
    }

    return result.embedding.values;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate embedding: Unknown error");
  }
}
