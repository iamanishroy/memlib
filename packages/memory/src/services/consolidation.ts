import type { MemoryDeps } from "../config";

export interface StaleMemoryGroup {
  namespace: string;
  entity: string;
  memories: {
    id: string;
    content: string;
    createdAt: Date;
    importance: number;
  }[];
}

export interface ConsolidationResult {
  namespace: string;
  entity: string;
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
 * (namespace, entity) group via LLM, stores a condensed memory, and
 * archives the originals.
 */
export async function consolidateMemories(
  deps: Pick<MemoryDeps, "pool" | "generateEmbedding" | "generateText">,
  ageDays = 7,
  limit = 50,
): Promise<ConsolidationResult[]> {
  const result = await deps.pool.query(
    `
    SELECT id, namespace, entity, content, created_at, importance
    FROM memories
    WHERE created_at < NOW() - make_interval(days => $1)
      AND archived = false
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY namespace, entity, created_at ASC
    LIMIT $2
    `,
    [ageDays, limit],
  );

  if (result.rows.length === 0) return [];

  // Group by (namespace, entity)
  const groups = new Map<string, StaleMemoryGroup>();
  for (const row of result.rows) {
    const ns = row.namespace as string;
    const ent = row.entity as string;
    const key = `${ns}::${ent}`;
    if (!groups.has(key)) {
      groups.set(key, { namespace: ns, entity: ent, memories: [] });
    }
    groups.get(key)!.memories.push({
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
        INSERT INTO memories (namespace, entity, content, embedding, importance, metadata)
        VALUES ($1, $2, $3, $4::vector, $5, $6)
        `,
        [
          group.namespace,
          group.entity,
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
        entity: group.entity,
        originalCount: group.memories.length,
        summary,
        archivedIds: ids,
      });
    } catch (error) {
      console.warn(
        `Consolidation failed for ${group.namespace}/${group.entity}:`,
        error,
      );
    }
  }

  return results;
}
