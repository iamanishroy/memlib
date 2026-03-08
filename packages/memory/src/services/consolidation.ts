import type { MemoryDeps } from "../config";

export interface StaleMemoryGroup {
  namespace: string;
  memories: {
    id: string;
    content: string;
    createdAt: Date;
    importance: number;
  }[];
}

export interface ConsolidationResult {
  namespace: string;
  originalCount: number;
  summary: string;
  archivedIds: string[];
}

const SUMMARIZE_PROMPT = `You are a memory consolidation system for an AI assistant.

Given the following list of older memories, create a single concise summary that captures all the important information. Preserve key facts, preferences, and details.

Memories:
`;

/**
 * Finds non-archived memories older than `ageDays`, summarizes each
 * namespace's group via LLM, stores a condensed memory, and
 * archives the originals.
 */
export async function consolidateMemories(
  deps: Pick<MemoryDeps, "pool" | "generateEmbedding" | "generateText">,
  ageDays = 7,
  limit = 50,
): Promise<ConsolidationResult[]> {
  const result = await deps.pool.query(
    `
    SELECT id, namespace, content, created_at, importance
    FROM memories
    WHERE created_at < NOW() - make_interval(days => $1)
      AND archived = false
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY namespace, created_at ASC
    LIMIT $2
    `,
    [ageDays, limit],
  );

  if (result.rows.length === 0) return [];

  const groups = new Map<string, StaleMemoryGroup>();
  for (const row of result.rows) {
    const ns = row.namespace as string;
    if (!groups.has(ns)) {
      groups.set(ns, { namespace: ns, memories: [] });
    }
    groups.get(ns)!.memories.push({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      importance: parseFloat(row.importance ?? 0.5),
    });
  }

  const results: ConsolidationResult[] = [];

  for (const group of groups.values()) {
    if (group.memories.length < 2) continue;

    try {
      const memoryList = group.memories
        .map((m, i) => `${i + 1}. ${m.content}`)
        .join("\n");

      const summary = await deps.generateText(SUMMARIZE_PROMPT + memoryList);
      const embedding = await deps.generateEmbedding(summary);
      const maxImportance = Math.max(
        ...group.memories.map((m) => m.importance),
      );

      await deps.pool.query(
        `
        INSERT INTO memories (namespace, content, embedding, importance, metadata)
        VALUES ($1, $2, $3::vector, $4, $5)
        `,
        [
          group.namespace,
          summary,
          `[${embedding.join(",")}]`,
          maxImportance,
          JSON.stringify({
            consolidatedFrom: group.memories.map((m) => m.id),
            consolidatedAt: new Date().toISOString(),
            originalCount: group.memories.length,
          }),
        ],
      );

      const ids = group.memories.map((m) => m.id);
      await deps.pool.query(
        `UPDATE memories SET archived = true WHERE id = ANY($1::uuid[])`,
        [ids],
      );

      results.push({
        namespace: group.namespace,
        originalCount: group.memories.length,
        summary,
        archivedIds: ids,
      });
    } catch (error) {
      console.warn(
        `Consolidation failed for namespace ${group.namespace}:`,
        error,
      );
    }
  }

  return results;
}
