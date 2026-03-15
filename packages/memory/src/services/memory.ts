import type { MemoryDeps } from "../config";
import { memories, memoryEvents, type Memory } from "../db/schema";
import { extractFacts, type ExtractedFact } from "./extraction";
import { resolveConflicts, type Conflict } from "./conflict";
import { eq, and } from "drizzle-orm";

// ─── Thresholds ───────────────────────────────────────────────────

const EXACT_DUP_THRESHOLD = 0.98; // Only skip truly identical content
const CONFLICT_THRESHOLD = 0.80; // Catch negation & subtle changes

// ─── Types ────────────────────────────────────────────────────────

export interface StoreMemoryOptions {
  metadata?: Record<string, unknown>;
  tags?: string[];
  /** TTL in seconds. If set, memory expires after this duration. */
  ttl?: number;
  source?: string;
}

export interface StoreSmartOptions extends StoreMemoryOptions {
  /** If false, stores raw content without fact extraction. Default: true */
  infer?: boolean;
}

export interface StoreResult {
  memories: (Memory & { event: string })[];
  skipped: number;
  conflicts: number;
}

// ─── Internal helpers ─────────────────────────────────────────────

interface SimilarMemory {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Find memories similar to the given embedding, scoped by namespace + entity.
 */
async function findSimilar(
  deps: Pick<MemoryDeps, "pool">,
  namespace: string,
  entity: string,
  embedding: number[],
  threshold: number,
  limit = 3,
): Promise<SimilarMemory[]> {
  const result = await deps.pool.query(
    `
    SELECT id, content,
           1 - (embedding <=> $1::vector) AS similarity
    FROM memories
    WHERE namespace = $2
      AND entity = $3
      AND archived = false
      AND (expires_at IS NULL OR expires_at > NOW())
      AND 1 - (embedding <=> $1::vector) > $4
    ORDER BY embedding <=> $1::vector
    LIMIT $5
    `,
    [`[${embedding.join(",")}]`, namespace, entity, threshold, limit],
  );

  return result.rows.map((r: any) => ({
    id: r.id,
    content: r.content,
    similarity: parseFloat(r.similarity),
  }));
}

/**
 * Log a memory event to the audit trail.
 */
async function logEvent(
  deps: Pick<MemoryDeps, "db">,
  memoryId: string,
  namespace: string,
  event: string,
  opts: {
    entity?: string;
    oldContent?: string;
    newContent?: string;
    mergedFromId?: string;
    reason?: string;
  } = {},
) {
  await deps.db.insert(memoryEvents).values({
    memoryId,
    namespace,
    entity: opts.entity ?? null,
    event,
    oldContent: opts.oldContent ?? null,
    newContent: opts.newContent ?? null,
    mergedFromId: opts.mergedFromId ?? null,
    reason: opts.reason ?? null,
  });
}

// ─── Raw store (no inference) ─────────────────────────────────────

/**
 * Store raw content directly — no fact extraction, no conflict resolution.
 * Deduplicates by exact cosine similarity (> 0.95).
 */
export async function storeMemory(
  deps: MemoryDeps,
  namespace: string,
  entity: string,
  content: string,
  options: StoreMemoryOptions = {},
): Promise<Memory & { deduplicated?: boolean }> {
  const { metadata = {}, tags = [], ttl, source } = options;

  const embedding = await deps.generateEmbedding(content);

  // Check for exact duplicate
  const similar = await findSimilar(
    deps,
    namespace,
    entity,
    embedding,
    EXACT_DUP_THRESHOLD,
    1,
  );
  if (similar.length > 0) {
    const existing = await deps.db.query.memories.findFirst({
      where: eq(memories.id, similar[0]!.id),
    });
    if (existing) {
      return { ...existing, deduplicated: true } as Memory & {
        deduplicated: boolean;
      };
    }
  }

  const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : undefined;

  const [memory] = await deps.db
    .insert(memories)
    .values({
      namespace,
      entity,
      content,
      embedding,
      importance: 0.5,
      tags,
      metadata,
      source,
      expiresAt,
    })
    .returning();

  if (!memory) {
    throw new Error("Failed to insert memory");
  }

  await logEvent(deps, memory.id, namespace, "ADD", {
    entity,
    newContent: content,
    reason: "Raw store",
  });

  return memory;
}

// ─── Smart store (with inference) ─────────────────────────────────

/**
 * Smart memory store pipeline:
 * 1. Extract facts + importance + category (single LLM call)
 * 2. Batch embed all facts
 * 3. For each: find similar, tier into skip/conflict/new
 * 4. Batch resolve conflicts (single LLM call, only if needed)
 * 5. Execute all actions and log events
 */
export async function storeSmartMemory(
  deps: MemoryDeps,
  namespace: string,
  entity: string,
  content: string,
  options: StoreSmartOptions = {},
): Promise<StoreResult> {
  const { metadata = {}, tags = [], ttl, source } = options;

  // ── Step 1: Extract facts ───────────────────────────────────
  const { facts } = await extractFacts(deps, content);

  if (facts.length === 0) {
    return { memories: [], skipped: 0, conflicts: 0 };
  }

  // ── Step 2: Batch embed all facts ───────────────────────────
  const embeddings = await Promise.all(
    facts.map((f) => deps.generateEmbedding(f.text)),
  );

  // ── Step 3: Classify each fact ──────────────────────────────
  const toInsert: { fact: ExtractedFact; embedding: number[] }[] = [];
  const toResolve: (Conflict & {
    fact: ExtractedFact;
    embedding: number[];
  })[] = [];
  let skipped = 0;

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i]!;
    const emb = embeddings[i]!;

    const similar = await findSimilar(
      deps,
      namespace,
      entity,
      emb,
      CONFLICT_THRESHOLD,
      3,
    );

    if (similar.length === 0) {
      toInsert.push({ fact, embedding: emb });
    } else if (similar[0]!.similarity > EXACT_DUP_THRESHOLD) {
      skipped++;
      await logEvent(deps, similar[0]!.id, namespace, "SKIP_DUPLICATE", {
        entity,
        oldContent: similar[0]!.content,
        newContent: fact.text,
        reason: `Similarity ${similar[0]!.similarity.toFixed(3)}`,
      });
    } else {
      toResolve.push({
        newFact: fact.text,
        existingId: similar[0]!.id,
        existingContent: similar[0]!.content,
        similarity: similar[0]!.similarity,
        fact,
        embedding: emb,
      });
    }
  }

  // ── Step 4: Resolve conflicts (single LLM call) ────────────
  const resultMemories: (Memory & { event: string })[] = [];

  if (toResolve.length > 0) {
    const { resolutions } = await resolveConflicts(
      deps,
      toResolve.map((c) => ({
        newFact: c.newFact,
        existingId: c.existingId,
        existingContent: c.existingContent,
        similarity: c.similarity,
      })),
    );

    for (let i = 0; i < resolutions.length; i++) {
      const resolution = resolutions[i]!;
      const conflictEntry = toResolve[i]!;

      switch (resolution.action) {
        case "MERGE": {
          const mergedContent =
            resolution.mergedContent || conflictEntry.newFact;
          const mergedEmbedding =
            await deps.generateEmbedding(mergedContent);

          await deps.pool.query(
            `UPDATE memories SET content = $1, embedding = $2::vector, importance = $3,
             category = $4, last_accessed = NOW()
             WHERE id = $5`,
            [
              mergedContent,
              `[${mergedEmbedding.join(",")}]`,
              Math.max(conflictEntry.fact.importance, 0.5),
              conflictEntry.fact.category,
              conflictEntry.existingId,
            ],
          );

          await logEvent(deps, conflictEntry.existingId, namespace, "MERGE", {
            entity,
            oldContent: conflictEntry.existingContent,
            newContent: mergedContent,
            reason: resolution.reason,
          });

          const updated = await deps.db.query.memories.findFirst({
            where: eq(memories.id, conflictEntry.existingId),
          });
          if (updated) resultMemories.push({ ...updated, event: "MERGE" });
          break;
        }

        case "REPLACE": {
          const replaceContent =
            resolution.mergedContent || conflictEntry.newFact;
          const replaceEmbedding =
            await deps.generateEmbedding(replaceContent);

          await deps.pool.query(
            `UPDATE memories SET content = $1, embedding = $2::vector, importance = $3,
             category = $4, last_accessed = NOW()
             WHERE id = $5`,
            [
              replaceContent,
              `[${replaceEmbedding.join(",")}]`,
              conflictEntry.fact.importance,
              conflictEntry.fact.category,
              conflictEntry.existingId,
            ],
          );

          await logEvent(
            deps,
            conflictEntry.existingId,
            namespace,
            "REPLACE",
            {
              entity,
              oldContent: conflictEntry.existingContent,
              newContent: replaceContent,
              reason: resolution.reason,
            },
          );

          const replaced = await deps.db.query.memories.findFirst({
            where: eq(memories.id, conflictEntry.existingId),
          });
          if (replaced)
            resultMemories.push({ ...replaced, event: "REPLACE" });
          break;
        }

        case "CONTRADICTION": {
          await deps.pool.query(
            `UPDATE memories SET archived = true WHERE id = $1`,
            [conflictEntry.existingId],
          );

          await logEvent(
            deps,
            conflictEntry.existingId,
            namespace,
            "DELETE",
            {
              entity,
              oldContent: conflictEntry.existingContent,
              reason: `Contradiction: ${resolution.reason}`,
            },
          );

          toInsert.push({
            fact: conflictEntry.fact,
            embedding: conflictEntry.embedding,
          });
          break;
        }

        case "KEEP_EXISTING":
        default: {
          skipped++;
          await logEvent(
            deps,
            conflictEntry.existingId,
            namespace,
            "KEEP_EXISTING",
            {
              entity,
              oldContent: conflictEntry.existingContent,
              newContent: conflictEntry.newFact,
              reason: resolution.reason,
            },
          );
          break;
        }
      }
    }
  }

  // ── Step 5: Insert new memories ─────────────────────────────
  if (toInsert.length > 0) {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : undefined;

    for (const { fact, embedding } of toInsert) {
      const [inserted] = await deps.db
        .insert(memories)
        .values({
          namespace,
          entity,
          content: fact.text,
          embedding,
          importance: fact.importance,
          category: fact.category,
          tags,
          metadata,
          source,
          expiresAt,
        })
        .returning();

      if (!inserted) continue;

      await logEvent(deps, inserted.id, namespace, "ADD", {
        entity,
        newContent: fact.text,
        reason: "New fact extracted",
      });

      resultMemories.push({ ...inserted, event: "ADD" });
    }
  }

  return {
    memories: resultMemories,
    skipped,
    conflicts: toResolve.length,
  };
}

// ─── Batch store (raw, no inference) ──────────────────────────────

export async function storeMemories(
  deps: MemoryDeps,
  namespace: string,
  entity: string,
  items: {
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ttl?: number;
  }[],
): Promise<Memory[]> {
  const processed = await Promise.all(
    items.map(async (item) => {
      const embedding = await deps.generateEmbedding(item.content);
      return {
        namespace,
        entity,
        content: item.content,
        embedding,
        importance: 0.5,
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

// ─── Read / Delete ────────────────────────────────────────────────

export async function getMemories(
  deps: MemoryDeps,
  namespace: string,
  entity?: string,
  limit = 50,
): Promise<Memory[]> {
  if (entity) {
    return deps.db.query.memories.findMany({
      where: and(
        eq(memories.namespace, namespace),
        eq(memories.entity, entity),
      ),
      limit,
      orderBy: (memories, { desc }) => [desc(memories.createdAt)],
    });
  }

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
  const existing = await deps.db.query.memories.findFirst({
    where: eq(memories.id, id),
  });

  if (existing) {
    await logEvent(deps, id, existing.namespace, "DELETE", {
      entity: existing.entity ?? undefined,
      oldContent: existing.content,
      reason: "Manual delete",
    });
  }

  await deps.db.delete(memories).where(eq(memories.id, id));
}

export async function getMemoryEvents(
  deps: MemoryDeps,
  namespace: string,
  memoryId?: string,
  limit = 50,
) {
  if (memoryId) {
    return deps.db.query.memoryEvents.findMany({
      where: and(
        eq(memoryEvents.namespace, namespace),
        eq(memoryEvents.memoryId, memoryId),
      ),
      limit,
      orderBy: (memoryEvents, { desc }) => [desc(memoryEvents.createdAt)],
    });
  }
  return deps.db.query.memoryEvents.findMany({
    where: eq(memoryEvents.namespace, namespace),
    limit,
    orderBy: (memoryEvents, { desc }) => [desc(memoryEvents.createdAt)],
  });
}
