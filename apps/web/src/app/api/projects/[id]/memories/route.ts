import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "@memz/db/schema/index";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

/** Connect to the project's own Postgres database. */
async function getProjectPool(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(schema.project)
    .where(
      and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)),
    );

  if (!project) return null;

  return new Pool({
    connectionString: project.databaseUrl,
    max: 1,
    idleTimeoutMillis: 5000,
  });
}

// ─── GET /api/projects/[id]/memories ────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "namespaces";

  const projectPool = await getProjectPool(id, session.user.id);
  if (!projectPool) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // ── List namespaces ──────────────────────────────────────────
    if (action === "namespaces") {
      const result = await projectPool.query(`
        SELECT namespace, COUNT(*)::int AS count
        FROM memories
        WHERE archived = false
        GROUP BY namespace
        ORDER BY namespace
      `);
      return Response.json(result.rows);
    }

    // ── List entities in a namespace ────────────────────────────
    if (action === "entities") {
      const namespace = url.searchParams.get("namespace");
      if (!namespace) {
        return Response.json(
          { error: "namespace is required" },
          { status: 400 },
        );
      }

      const result = await projectPool.query(
        `
        SELECT entity, COUNT(*)::int AS count
        FROM memories
        WHERE namespace = $1 AND archived = false
        GROUP BY entity
        ORDER BY entity
        `,
        [namespace],
      );
      return Response.json(result.rows);
    }

    // ── List memories for a namespace + entity ─────────────────
    if (action === "list") {
      const namespace = url.searchParams.get("namespace");
      if (!namespace) {
        return Response.json(
          { error: "namespace is required" },
          { status: 400 },
        );
      }

      const entity = url.searchParams.get("entity");
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") ?? "50", 10),
        200,
      );
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

      let whereClause = "namespace = $1 AND archived = false";
      const queryParams: (string | number)[] = [namespace];

      if (entity) {
        queryParams.push(entity);
        whereClause += ` AND entity = $${queryParams.length}`;
      }

      const countParams = [...queryParams];
      queryParams.push(limit, offset);

      const result = await projectPool.query(
        `
        SELECT id, namespace, entity, content, importance, category, tags, memory_type,
               source, archived, expires_at, created_at, last_accessed, metadata
        FROM memories
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${countParams.length + 1} OFFSET $${countParams.length + 2}
        `,
        queryParams,
      );

      const countResult = await projectPool.query(
        `SELECT COUNT(*)::int AS total FROM memories WHERE ${whereClause}`,
        countParams,
      );

      return Response.json({
        memories: result.rows,
        total: countResult.rows[0]?.total ?? 0,
      });
    }

    // ── Get single memory ──────────────────────────────────────
    if (action === "get") {
      const memoryId = url.searchParams.get("id");
      if (!memoryId) {
        return Response.json({ error: "id is required" }, { status: 400 });
      }

      const result = await projectPool.query(
        `
        SELECT id, namespace, entity, content, importance, category, tags, memory_type,
               source, archived, expires_at, created_at, last_accessed, metadata
        FROM memories WHERE id = $1
        `,
        [memoryId],
      );

      if (result.rows.length === 0) {
        return Response.json({ error: "Memory not found" }, { status: 404 });
      }

      return Response.json(result.rows[0]);
    }

    // ── Stats for dashboard ────────────────────────────────────
    if (action === "stats") {
      const result = await projectPool.query(`
        SELECT
          COUNT(*)::int AS total_memories,
          COUNT(DISTINCT namespace)::int AS namespace_count,
          COUNT(DISTINCT entity)::int AS entity_count,
          ROUND(AVG(importance)::numeric, 2) AS avg_importance
        FROM memories
        WHERE archived = false
      `);

      const nsByCount = await projectPool.query(`
        SELECT namespace, COUNT(*)::int AS count
        FROM memories WHERE archived = false
        GROUP BY namespace ORDER BY count DESC LIMIT 10
      `);

      const entByCount = await projectPool.query(`
        SELECT entity, COUNT(*)::int AS count
        FROM memories WHERE archived = false
        GROUP BY entity ORDER BY count DESC LIMIT 10
      `);

      const recentActivity = await projectPool.query(`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM memories WHERE archived = false
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC LIMIT 30
      `);

      return Response.json({
        ...result.rows[0],
        namespaces: nsByCount.rows,
        entities: entByCount.rows,
        recentActivity: recentActivity.rows,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    // Handle missing "memories" table (e.g. fresh project DB with no data yet)
    // PostgreSQL error code 42P01 = "undefined_table"
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === "42P01") {
      if (action === "namespaces" || action === "entities") {
        return Response.json([]);
      }
      if (action === "list") {
        return Response.json({ memories: [], total: 0 });
      }
      if (action === "stats") {
        return Response.json({
          total_memories: 0,
          namespace_count: 0,
          entity_count: 0,
          avg_importance: 0,
          namespaces: [],
          entities: [],
          recentActivity: [],
        });
      }
      if (action === "get") {
        return Response.json({ error: "Memory not found" }, { status: 404 });
      }
    }
    throw err;
  } finally {
    await projectPool.end();
  }
}

// ─── DELETE /api/projects/[id]/memories ─────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as { memoryId?: string; action?: string };

  const projectPool = await getProjectPool(id, session.user.id);
  if (!projectPool) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Purge all memories
    if (body.action === "purge") {
      const result = await projectPool.query(`DELETE FROM memories`);
      return Response.json({ ok: true, deleted: result.rowCount });
    }

    // Delete single memory
    if (!body.memoryId) {
      return Response.json({ error: "memoryId is required" }, { status: 400 });
    }
    await projectPool.query(`DELETE FROM memories WHERE id = $1`, [
      body.memoryId,
    ]);
    return Response.json({ ok: true });
  } finally {
    await projectPool.end();
  }
}

// ─── POST /api/projects/[id]/memories — recall or store ────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    action: string;
    namespace: string;
    entity: string;
    query?: string;
    content?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    limit?: number;
    messages?: { role: string; content: string }[];
    maxCandidates?: number;
    maxTokens?: number;
    category?: string;
  };

  if (body.action !== "recall" && body.action !== "store" && body.action !== "prepare") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get project config for embedding + LLM
  const [project] = await db
    .select()
    .from(schema.project)
    .where(
      and(eq(schema.project.id, id), eq(schema.project.userId, session.user.id)),
    );

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { createMemoryService } = await import("@memz/memory");
  const memoryService = createMemoryService({
    database: { connectionString: project.databaseUrl },
    embedding: {
      provider: project.embeddingProvider as "gemini" | "openai",
      apiKey: project.embeddingApiKey,
    },
    llm: {
      provider: project.llmProvider as "gemini" | "openai" | "anthropic",
      apiKey: project.llmApiKey,
      model: project.llmModel ?? undefined,
    },
  });

  try {
    // ── Recall ─────────────────────────────────────────────────
    if (body.action === "recall") {
      if (!body.namespace || !body.entity || !body.query) {
        return Response.json(
          { error: "namespace, entity, and query are required" },
          { status: 400 },
        );
      }
      const results = await memoryService.recall(
        body.namespace,
        body.entity,
        body.query,
        { limit: body.limit ?? 10 },
      );
      return Response.json(results);
    }

    // ── Prepare (context-aware synthesis) ─────────────────────
    if (body.action === "prepare") {
      if (!body.namespace || !body.entity || !body.messages) {
        return Response.json(
          { error: "namespace, entity, and messages are required" },
          { status: 400 },
        );
      }
      const result = await memoryService.prepare(
        body.namespace,
        body.entity,
        body.messages as any,
        {
          maxCandidates: body.maxCandidates,
          maxTokens: body.maxTokens,
          category: body.category,
        },
      );
      return Response.json(result);
    }

    // ── Store ──────────────────────────────────────────────────
    if (body.action === "store") {
      if (!body.namespace || !body.entity || !body.content) {
        return Response.json(
          { error: "namespace, entity, and content are required" },
          { status: 400 },
        );
      }
      const result = await memoryService.smartStore(
        body.namespace,
        body.entity,
        body.content,
        {
          tags: body.tags,
          metadata: body.metadata,
        },
      );
      return Response.json(result);
    }
  } finally {
    await memoryService.close();
  }
}

