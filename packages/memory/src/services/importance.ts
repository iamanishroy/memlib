import type { MemoryDeps } from "../config";

const IMPORTANCE_PROMPT = `You are a memory importance scorer for an AI assistant.

Rate the following memory on a scale from 0.0 to 1.0 based on how important it is to remember long-term.

Scoring guide:
- 0.0-0.2: Trivial (greetings, "ok", "thanks", small talk)
- 0.2-0.4: Low (general observations, routine info)
- 0.4-0.6: Medium (useful facts, preferences, opinions)
- 0.6-0.8: High (important personal info, strong preferences, work details)
- 0.8-1.0: Critical (core identity, crucial decisions, key relationships)

Reply with ONLY a number between 0.0 and 1.0, nothing else.

Memory: `;

/**
 * Uses LLM to score a memory's importance from 0.0 to 1.0.
 * Falls back to 0.5 if scoring fails (non-critical path).
 */
export async function scoreImportance(
  deps: Pick<MemoryDeps, "generateText">,
  content: string,
): Promise<number> {
  try {
    const response = await deps.generateText(IMPORTANCE_PROMPT + content);
    const score = parseFloat(response);

    if (isNaN(score) || score < 0 || score > 1) {
      console.warn(
        `Importance scorer returned invalid value "${response}", defaulting to 0.5`,
      );
      return 0.5;
    }

    return Math.round(score * 100) / 100;
  } catch (error) {
    console.warn("Importance scoring failed, defaulting to 0.5:", error);
    return 0.5;
  }
}
