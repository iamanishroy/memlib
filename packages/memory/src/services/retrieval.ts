import type { MemoryDeps } from "../config";

export interface RetrievedMemory {
  id: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
  recency: number;
  importance: number;
  score: number;
}

export interface RecallOptions {
  /** Filter by tags — returns memories that have ANY of these tags */
  tags?: string[];
  /** Minimum importance threshold (0.0–1.0) */
  minImportance?: number;
  limit?: number;
}

/**
 * Retrieve memories using hybrid scoring:
 *   score = 0.6 * similarity + 0.2 * recency + 0.2 * importance
 */
export async function retrieveMemories(
  deps: Pick<MemoryDeps, "pool" | "generateEmbedding">,
  namespace: string,
  query: string,
  options: RecallOptions | number = {},
): Promise<RetrievedMemory[]> {
  const opts: RecallOptions =
    typeof options === "number" ? { limit: options } : options;
  const { tags, minImportance, limit = 10 } = opts;

  const embedding = await deps.generateEmbedding(query);

  const conditions = [
    "namespace = $2",
    "archived = false",
    "(expires_at IS NULL OR expires_at > NOW())",
  ];
  const params: any[] = [`[${embedding.join(",")}]`, namespace];

  if (tags && tags.length > 0) {
    params.push(tags);
    conditions.push(`tags && $${params.length}::text[]`);
  }

  if (minImportance !== undefined) {
    params.push(minImportance);
    conditions.push(`importance >= $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT
      id,
      content,
      tags,
      metadata,
      importance,
      1 - (embedding <=> $1::vector) AS similarity,
      GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 86400)) AS recency
    FROM memories
    WHERE ${conditions.join(" AND ")}
    ORDER BY embedding <=> $1::vector
    LIMIT $${params.length}
  `;

  const result = await deps.pool.query(sql, params);

  if (result.rows.length === 0) return [];

  const ids = result.rows.map((r: any) => r.id);
  await deps.pool.query(
    `UPDATE memories SET last_accessed = NOW() WHERE id = ANY($1::uuid[])`,
    [ids],
  );

  return result.rows
    .map((row: any) => {
      const similarity = parseFloat(row.similarity);
      const recency = parseFloat(row.recency);
      const importance = parseFloat(row.importance ?? 0.5);
      const score = 0.6 * similarity + 0.2 * recency + 0.2 * importance;

      return {
        id: row.id,
        content: row.content,
        tags: row.tags,
        metadata: row.metadata,
        similarity,
        recency,
        importance,
        score,
      };
    })
    .sort((a: RetrievedMemory, b: RetrievedMemory) => b.score - a.score);
}
