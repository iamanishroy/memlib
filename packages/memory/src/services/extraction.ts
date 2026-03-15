import type { MemoryDeps } from "../config";

export interface ExtractedFact {
  text: string;
  importance: number;
  category: string;
}

export interface ExtractionResult {
  facts: ExtractedFact[];
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a piece of text (which may be a conversation, a statement, or any content), extract distinct, atomic facts worth remembering long-term.

For each fact, provide:
1. "text": A clean, self-contained statement of the fact (3rd person, e.g., "Prefers dark mode")
2. "importance": Score from 0.0 to 1.0:
   - 0.0–0.2: Trivial (greetings, filler, "ok")
   - 0.2–0.4: Low (generic observations, routine info)
   - 0.4–0.6: Medium (preferences, opinions, useful facts)
   - 0.6–0.8: High (important personal info, work details, strong preferences)
   - 0.8–1.0: Critical (core identity, key relationships, crucial decisions)
3. "category": One of: "preference", "personal", "professional", "plan", "health", "relationship", "opinion", "fact", "other"

Rules:
- Extract ONLY facts worth remembering. Skip greetings, filler, and trivial exchanges.
- Each fact should be atomic — one idea per fact.
- Write facts in 3rd person perspective (e.g., "Prefers TypeScript" not "I prefer TypeScript").
- If the input is a conversation, extract facts from ALL participant messages.
- If nothing worth remembering, return an empty facts array.
- Return ONLY valid JSON, no markdown or extra text.

Output format:
{"facts": [{"text": "...", "importance": 0.7, "category": "preference"}, ...]}

Input:
`;

/**
 * Extracts structured facts from content using a single LLM call.
 * Combines fact extraction + importance scoring + categorization.
 */
export async function extractFacts(
  deps: Pick<MemoryDeps, "generateText">,
  content: string,
): Promise<ExtractionResult> {
  if (!content || content.trim().length === 0) {
    return { facts: [] };
  }

  try {
    const response = await deps.generateText(EXTRACTION_PROMPT + content);

    // Strip markdown code fences if present
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ExtractionResult;

    if (!parsed.facts || !Array.isArray(parsed.facts)) {
      return { facts: [] };
    }

    // Validate and clamp each fact
    const validFacts = parsed.facts
      .filter(
        (f) =>
          f.text &&
          typeof f.text === "string" &&
          f.text.trim().length > 0,
      )
      .map((f) => ({
        text: f.text.trim(),
        importance:
          Math.round(Math.min(1, Math.max(0, f.importance ?? 0.5)) * 100) / 100,
        category: f.category || "other",
      }));

    return { facts: validFacts };
  } catch (error) {
    console.warn("Fact extraction failed, returning empty:", error);
    return { facts: [] };
  }
}
