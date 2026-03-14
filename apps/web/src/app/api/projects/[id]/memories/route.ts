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

      // Check if entity column exists
      const colCheck = await projectPool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'entity'
      `);
      const hasEntity = colCheck.rows.length > 0;

      if (hasEntity) {
        const result = await projectPool.query(
          `
          SELECT COALESCE(entity, 'default') as entity, COUNT(*)::int AS count
          FROM memories
          WHERE namespace = $1 AND archived = false
          GROUP BY entity
          ORDER BY entity
          `,
          [namespace],
        );
        return Response.json(result.rows);
      } else {
        // No entity column yet — return a single "default" entity
        const result = await projectPool.query(
          `SELECT COUNT(*)::int AS count FROM memories WHERE namespace = $1 AND archived = false`,
          [namespace],
        );
        return Response.json([
          { entity: "default", count: result.rows[0]?.count ?? 0 },
        ]);
      }
    }

    // ── List memories for a namespace (+ optional entity) ──────
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

      // Check if entity column exists
      const colCheck = await projectPool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'entity'
      `);
      const hasEntity = colCheck.rows.length > 0;

      let whereClause = "namespace = $1 AND archived = false";
      const queryParams: (string | number)[] = [namespace];

      if (hasEntity && entity && entity !== "default") {
        whereClause += " AND entity = $" + (queryParams.length + 1);
        queryParams.push(entity);
      }

      const countParams = [...queryParams];
      queryParams.push(limit, offset);

      const result = await projectPool.query(
        `
        SELECT id, namespace, content, importance, tags, memory_type,
               archived, expires_at, created_at, last_accessed, metadata
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
        SELECT id, namespace, content, importance, tags, memory_type,
               archived, expires_at, created_at, last_accessed, metadata
        FROM memories WHERE id = $1
        `,
        [memoryId],
      );

      if (result.rows.length === 0) {
        return Response.json({ error: "Memory not found" }, { status: 404 });
      }

      return Response.json(result.rows[0]);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
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
  const body = (await req.json()) as { memoryId: string };

  if (!body.memoryId) {
    return Response.json({ error: "memoryId is required" }, { status: 400 });
  }

  const projectPool = await getProjectPool(id, session.user.id);
  if (!projectPool) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    await projectPool.query(`DELETE FROM memories WHERE id = $1`, [
      body.memoryId,
    ]);
    return Response.json({ ok: true });
  } finally {
    await projectPool.end();
  }
}
