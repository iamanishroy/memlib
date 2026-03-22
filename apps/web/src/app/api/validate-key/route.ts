import { validateLLMApiKey, validateEmbeddingApiKey } from "@memlib/ai";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    type: "llm" | "embedding";
    provider: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
  };

  const { type, provider, apiKey, model, baseUrl } = body;

  if (!type || !provider || !apiKey) {
    return Response.json(
      {
        valid: false,
        error: "Missing required fields: type, provider, apiKey",
      },
      { status: 400 },
    );
  }

  const result =
    type === "embedding"
      ? await validateEmbeddingApiKey(provider, apiKey, model, baseUrl)
      : await validateLLMApiKey(provider, apiKey, model, baseUrl);

  return Response.json(result);
}
