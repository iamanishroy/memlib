/**
 * Calls Gemini to generate text completions.
 * Used by importance scoring and consolidation summarization.
 */
export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Please set GEMINI_API_KEY in .env file",
    );
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini API returned error (${response.status}): ${errorText}`,
    );
  }

  const result = (await response.json()) as any;

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}
