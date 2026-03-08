import { z } from "zod";
import { publicProcedure } from "../index";
import { createMemoryService, type MemoryService } from "@memz/memory";
import { db } from "@memz/db";
import { project } from "@memz/db/schema/index";
import { eq } from "drizzle-orm";

// ─── Pool Cache ──────────────────────────────────────────────────
// Cache MemoryService instances by projectId to avoid creating
// a new pg Pool on every request.

const serviceCache = new Map<
  string,
  { service: MemoryService; lastUsed: number }
>();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getMemoryService(projectId: string): Promise<MemoryService> {
  const cached = serviceCache.get(projectId);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.service;
  }

  const proj = await db.query.project.findFirst({
    where: eq(project.id, projectId),
  });

  if (!proj) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const service = createMemoryService({
    database: { connectionString: proj.databaseUrl },
    embedding: {
      provider: proj.embeddingProvider as "gemini" | "openai",
      apiKey: proj.embeddingApiKey,
    },
    llm: {
      provider: proj.llmProvider as "gemini" | "openai" | "anthropic",
      apiKey: proj.llmApiKey,
      model: proj.llmModel,
    },
  });

  serviceCache.set(projectId, { service, lastUsed: Date.now() });

  // Clean up stale entries periodically
  cleanupCache();

  return service;
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of serviceCache) {
    if (now - entry.lastUsed > CACHE_TTL_MS) {
      entry.service.close().catch(console.error);
      serviceCache.delete(key);
    }
  }
}

// ─── Memory Router ───────────────────────────────────────────────

export const memoryRouter = {
  /** Run migrations to set up the memories table + pgvector */
  migrate: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      await memory.migrate();
      return { success: true };
    }),

  /** Store a single memory */
  store: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        namespace: z.string(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        ttl: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      const result = await memory.store(input.namespace, input.content, {
        tags: input.tags,
        metadata: input.metadata,
        ttl: input.ttl,
      });
      return result;
    }),

  /** Batch store memories */
  batchStore: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        namespace: z.string(),
        memories: z.array(
          z.object({
            content: z.string(),
            tags: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
            ttl: z.number().optional(),
          }),
        ),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      const result = await memory.batchStore(input.namespace, input.memories);
      return { count: result.length, memories: result };
    }),

  /** List memories in a namespace */
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        namespace: z.string(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      return memory.list(input.namespace, input.limit);
    }),

  /** Delete a memory by ID */
  delete: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        memoryId: z.string().uuid(),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      await memory.delete(input.memoryId);
      return { deleted: true };
    }),

  /** Semantic recall with hybrid scoring */
  recall: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        namespace: z.string(),
        query: z.string(),
        limit: z.number().optional(),
        tags: z.array(z.string()).optional(),
        minImportance: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      return memory.recall(input.namespace, input.query, {
        limit: input.limit,
        tags: input.tags,
        minImportance: input.minImportance,
      });
    }),

  /** Trigger memory consolidation */
  consolidate: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        ageDays: z.number().optional(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      const results = await memory.consolidate(input.ageDays, input.limit);
      return {
        message: "Consolidation complete",
        consolidated: results.length,
        results,
      };
    }),

  /** Health check for a project's memory DB */
  health: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .handler(async ({ input }) => {
      const memory = await getMemoryService(input.projectId);
      return memory.health();
    }),
};
