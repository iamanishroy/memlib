import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "@memlib/db/schema/index";
import { randomBytes, createHash } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

/** Verify the caller owns the project */
async function verifyProjectOwner(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(schema.project)
    .where(
      and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)),
    );
  return !!project;
}

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `sk_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = `${raw.slice(0, 7)}...${raw.slice(-4)}`;
  return { raw, hash, prefix };
}

function generateId(): string {
  return randomBytes(12).toString("hex");
}

const PERMISSION_LABELS: Record<number, string> = {
  1: "read",
  2: "write",
  3: "admin",
};

// ─── GET — list all keys for a project ─────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!(await verifyProjectOwner(projectId, session.user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const keys = await db
    .select({
      id: schema.apiKey.id,
      name: schema.apiKey.name,
      keyPrefix: schema.apiKey.keyPrefix,
      permission: schema.apiKey.permission,
      createdAt: schema.apiKey.createdAt,
      revokedAt: schema.apiKey.revokedAt,
    })
    .from(schema.apiKey)
    .where(eq(schema.apiKey.projectId, projectId));

  return Response.json(keys);
}

// ─── POST — create a new API key ───────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!(await verifyProjectOwner(projectId, session.user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { name: string; permission?: number };
  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const permission = body.permission ?? 1;
  if (![1, 2, 3].includes(permission)) {
    return Response.json(
      { error: "Permission must be 1 (read), 2 (read & write), or 3 (admin)" },
      { status: 400 },
    );
  }

  const { raw, hash, prefix } = generateApiKey();
  const id = generateId();

  const [created] = await db
    .insert(schema.apiKey)
    .values({
      id,
      name: body.name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      permission,
      projectId,
    })
    .returning();

  // Return full key ONCE — client must copy it now
  return Response.json({
    id: created.id,
    name: created.name,
    key: raw,
    keyPrefix: created.keyPrefix,
    permission: created.permission,
    createdAt: created.createdAt,
  });
}

// ─── DELETE — revoke a key ─────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!(await verifyProjectOwner(projectId, session.user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { id: string };
  if (!body.id) {
    return Response.json({ error: "Key ID is required" }, { status: 400 });
  }

  const [revoked] = await db
    .update(schema.apiKey)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.apiKey.id, body.id),
        eq(schema.apiKey.projectId, projectId),
      ),
    )
    .returning();

  if (!revoked) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
