import { z } from "zod";
import pg from "pg";
import { apiKeyProcedure } from "../index";
import { createMemoryService, type MemoryService } from "@memz/memory";

const { Client } = pg;

// ─── Service Factory ─────────────────────────────────────────────

async function getMemoryService(
  projectId: string,
  databaseUrl: string,
): Promise<MemoryService> {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT "databaseUrl", "embeddingProvider", "embeddingApiKey",
              "llmProvider", "llmApiKey", "llmModel"
       FROM project WHERE id = $1 LIMIT 1`,
      [projectId],
    );
    const proj = result.rows[0];
    if (!proj) throw new Error(`Project not found: ${projectId}`);

    return createMemoryService({
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
  } finally {
    await client.end();
  }
}

/** Helper to run a handler with automatic service cleanup */
async function withService<T>(
  projectId: string,
  databaseUrl: string,
  fn: (service: MemoryService) => Promise<T>,
): Promise<T> {
  const service = await getMemoryService(projectId, databaseUrl);
  try {
    return await fn(service);
  } finally {
    await service.close();
  }
}

// ─── Permission Levels ───────────────────────────────────────────
//   1 = Read          → list, recall, health, events
//   2 = Read & Write  → store, smartStore, batchStore
//   3 = Admin         → delete, consolidate, migrate

// ─── Memory Router ───────────────────────────────────────────────

export const memoryRouter = {
  /** POST /v1/memory/migrate — set up memories table + pgvector */
  migrate: apiKeyProcedure(3)
    .route({ method: "POST", path: "/migrate" })
    .handler(async ({ context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          await memory.migrate();
          return { success: true };
        },
      );
    }),

  /** POST /v1/memory — store a single memory (raw or smart) */
  store: apiKeyProcedure(2)
    .route({ method: "POST", path: "/" })
    .input(
      z.object({
        namespace: z.string(),
        entity: z.string(),
        content: z.string(),
        infer: z.boolean().optional().default(true),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        source: z.string().optional(),
        ttl: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          if (input.infer) {
            return memory.smartStore(input.namespace, input.entity, input.content, {
              tags: input.tags,
              metadata: input.metadata,
              source: input.source,
              ttl: input.ttl,
            });
          } else {
            const result = await memory.store(input.namespace, input.entity, input.content, {
              tags: input.tags,
              metadata: input.metadata,
              source: input.source,
              ttl: input.ttl,
            });
            return {
              memories: [{ ...result, event: "ADD" }],
              skipped: 0,
              conflicts: 0,
            };
          }
        },
      );
    }),

  /** POST /v1/memory/batch — batch store memories (raw, no inference) */
  batchStore: apiKeyProcedure(2)
    .route({ method: "POST", path: "/batch" })
    .input(
      z.object({
        namespace: z.string(),
        entity: z.string(),
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
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          const result = await memory.batchStore(
            input.namespace,
            input.entity,
            input.memories,
          );
          return { count: result.length, memories: result };
        },
      );
    }),

  /** GET /v1/memory — list memories in a namespace */
  list: apiKeyProcedure(1)
    .route({ method: "GET", path: "/" })
    .input(
      z.object({
        namespace: z.string(),
        entity: z.string().optional(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          return memory.list(input.namespace, input.entity, input.limit);
        },
      );
    }),

  /** DELETE /v1/memory/{memoryId} — delete a memory */
  delete: apiKeyProcedure(3)
    .route({ method: "DELETE", path: "/{memoryId}" })
    .input(
      z.object({
        memoryId: z.string().uuid(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          await memory.delete(input.memoryId);
          return { deleted: true };
        },
      );
    }),

  /** POST /v1/memory/recall — semantic recall */
  recall: apiKeyProcedure(1)
    .route({ method: "POST", path: "/recall" })
    .input(
      z.object({
        namespace: z.string(),
        entity: z.string(),
        query: z.string(),
        category: z.string().optional(),
        limit: z.number().optional(),
        tags: z.array(z.string()).optional(),
        minImportance: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          return memory.recall(input.namespace, input.entity, input.query, {
            category: input.category,
            limit: input.limit,
            tags: input.tags,
            minImportance: input.minImportance,
          });
        },
      );
    }),

  /** POST /v1/memory/consolidate — trigger consolidation */
  consolidate: apiKeyProcedure(3)
    .route({ method: "POST", path: "/consolidate" })
    .input(
      z.object({
        ageDays: z.number().optional(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          const results = await memory.consolidate(input.ageDays, input.limit);
          return {
            message: "Consolidation complete",
            consolidated: results.length,
            results,
          };
        },
      );
    }),

  /** GET /v1/memory/events — get audit trail */
  events: apiKeyProcedure(1)
    .route({ method: "GET", path: "/events" })
    .input(
      z.object({
        namespace: z.string(),
        memoryId: z.string().uuid().optional(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          return memory.events(input.namespace, input.memoryId, input.limit);
        },
      );
    }),

  /** GET /v1/memory/health — health check */
  health: apiKeyProcedure(1)
    .route({ method: "GET", path: "/health" })
    .handler(async ({ context }) => {
      return withService(
        context.projectId,
        (context as any).databaseUrl,
        async (memory) => {
          return memory.health();
        },
      );
    }),
};
