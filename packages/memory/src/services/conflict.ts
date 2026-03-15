import type { MemoryDeps } from "../config";

export type ConflictAction =
  | "MERGE"
  | "REPLACE"
  | "KEEP_EXISTING"
  | "CONTRADICTION";

export interface Conflict {
  newFact: string;
  existingId: string;
  existingContent: string;
  similarity: number;
}

export interface ConflictResolution {
  existingId: string;
  newFact: string;
  action: ConflictAction;
  /** For MERGE: the merged content. For REPLACE/CONTRADICTION: the new content. */
  mergedContent?: string;
  reason?: string;
}

export interface ConflictResolutionResult {
  resolutions: ConflictResolution[];
}

const CONFLICT_PROMPT = `You are a memory conflict resolver. Given pairs of (new fact, existing memory), decide what to do for each.

Actions:
- MERGE: Both contain useful info — combine into one richer memory. Provide the merged text in "mergedContent".
- REPLACE: New fact supersedes or is strictly more informative. Provide the new fact text in "mergedContent".
- KEEP_EXISTING: Existing memory already captures this info adequately. No content change needed.
- CONTRADICTION: New fact directly contradicts the existing memory. Delete the old one and insert the new one. Provide the new fact text in "mergedContent".

Rules:
- Be conservative with CONTRADICTION — only use when facts genuinely oppose each other (e.g., "likes X" vs "dislikes X").
- Prefer MERGE when both facts add value (e.g., "likes cheese pizza" + "loves chicken pizza" → "likes cheese and chicken pizza").
- Use KEEP_EXISTING when the new fact is just a restatement with no new info.
- Write merged/replaced content in 3rd person.
- Return ONLY valid JSON, no markdown or extra text.

Output format:
{"resolutions": [{"existingId": "...", "action": "MERGE", "mergedContent": "...", "reason": "..."}, ...]}

Conflicts:
`;

/**
 * Resolves all detected conflicts in a single batched LLM call.
 */
export async function resolveConflicts(
  deps: Pick<MemoryDeps, "generateText">,
  conflicts: Conflict[],
): Promise<ConflictResolutionResult> {
  if (conflicts.length === 0) {
    return { resolutions: [] };
  }

  const conflictList = conflicts
    .map(
      (c, i) =>
        `${i + 1}. New: "${c.newFact}" ↔ Existing [${c.existingId}]: "${c.existingContent}" (similarity: ${c.similarity.toFixed(2)})`,
    )
    .join("\n");

  try {
    const response = await deps.generateText(CONFLICT_PROMPT + conflictList);

    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ConflictResolutionResult;

    if (!parsed.resolutions || !Array.isArray(parsed.resolutions)) {
      return {
        resolutions: conflicts.map((c) => ({
          existingId: c.existingId,
          newFact: c.newFact,
          action: "KEEP_EXISTING" as ConflictAction,
          reason: "Failed to parse resolution, defaulting to keep",
        })),
      };
    }

    return {
      resolutions: parsed.resolutions.map((r, i) => ({
        existingId: r.existingId || conflicts[i]?.existingId || "",
        newFact: r.newFact || conflicts[i]?.newFact || "",
        action: (
          ["MERGE", "REPLACE", "KEEP_EXISTING", "CONTRADICTION"].includes(
            r.action,
          )
            ? r.action
            : "KEEP_EXISTING"
        ) as ConflictAction,
        mergedContent: r.mergedContent,
        reason: r.reason,
      })),
    };
  } catch (error) {
    console.warn("Conflict resolution failed, keeping existing:", error);
    return {
      resolutions: conflicts.map((c) => ({
        existingId: c.existingId,
        newFact: c.newFact,
        action: "KEEP_EXISTING" as ConflictAction,
        reason: "Resolution failed, defaulting to keep",
      })),
    };
  }
}
