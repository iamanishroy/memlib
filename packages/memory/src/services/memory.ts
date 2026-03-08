import type { MemoryDeps } from "../config";
import { memories, type Memory } from "../db/schema";
import { scoreImportance } from "./importance";
import { eq } from "drizzle-orm";

const DEDUP_SIMILARITY_THRESHOLD = 0.95;

/**
 * Check if a very similar memory already exists in this namespace.
 */
async function findDuplicate(
  deps: Pick<MemoryDeps, "pool">,
  namespace: string,
  embedding: number[],
): Promise<Memory | null> {
  const result = await deps.pool.query(
    `
    SELECT id, namespace, content, embedding, importance, tags, memory_type,
           archived, expires_at, created_at, last_accessed, metadata,
           1 - (embedding <=> $1::vector) AS similarity
    FROM memories
    WHERE namespace = $2
      AND archived = false
      AND 1 - (embedding <=> $1::vector) > $3
    ORDER BY embedding <=> $1::vector
    LIMIT 1
    `,
    [`[${embedding.join(",")}]`, namespace, DEDUP_SIMILARITY_THRESHOLD],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

export interface StoreMemoryOptions {
  metadata?: Record<string, unknown>;
  tags?: string[];
  /** TTL in seconds. If set, memory expires after this duration. */
  ttl?: number;
}

export async function storeMemory(
  deps: MemoryDeps,
  namespace: string,
  content: string,
  options: StoreMemoryOptions = {},
): Promise<Memory & { deduplicated?: boolean }> {
  const { metadata = {}, tags = [], ttl } = options;

  const [embedding, importance] = await Promise.all([
    deps.generateEmbedding(content),
    scoreImportance(deps, content),
  ]);

  const existing = await findDuplicate(deps, namespace, embedding);
  if (existing) {
    return { ...existing, deduplicated: true } as Memory & {
      deduplicated: boolean;
    };
  }

  const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : undefined;

  const [memory] = await deps.db
    .insert(memories)
    .values({
      namespace,
      content,
      embedding,
      importance,
      tags,
      metadata,
      expiresAt,
    })
    .returning();

  if (!memory) {
    throw new Error("Failed to insert memory");
  }

  return memory;
}

/**
 * Batch store multiple memories in a single namespace.
 */
export async function storeMemories(
  deps: MemoryDeps,
  namespace: string,
  items: {
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ttl?: number;
  }[],
): Promise<Memory[]> {
  const processed = await Promise.all(
    items.map(async (item) => {
      const [embedding, importance] = await Promise.all([
        deps.generateEmbedding(item.content),
        scoreImportance(deps, item.content),
      ]);
      return {
        namespace,
        content: item.content,
        embedding,
        importance,
        tags: item.tags ?? [],
        metadata: item.metadata ?? {},
        expiresAt: item.ttl
          ? new Date(Date.now() + item.ttl * 1000)
          : undefined,
      };
    }),
  );

  const result = await deps.db.insert(memories).values(processed).returning();
  return result;
}

export async function getMemories(
  deps: MemoryDeps,
  namespace: string,
  limit = 50,
): Promise<Memory[]> {
  return deps.db.query.memories.findMany({
    where: eq(memories.namespace, namespace),
    limit,
    orderBy: (memories, { desc }) => [desc(memories.createdAt)],
  });
}

export async function deleteMemory(
  deps: MemoryDeps,
  id: string,
): Promise<void> {
  await deps.db.delete(memories).where(eq(memories.id, id));
}
