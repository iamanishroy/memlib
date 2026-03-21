import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "@memlib/db/schema/index";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [project] = await db
    .select()
    .from(schema.project)
    .where(
      and(
        eq(schema.project.id, id),
        eq(schema.project.userId, session.user.id),
      ),
    );

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as Partial<
    typeof schema.project.$inferInsert
  >;

  const [project] = await db
    .update(schema.project)
    .set(body)
    .where(
      and(
        eq(schema.project.id, id),
        eq(schema.project.userId, session.user.id),
      ),
    )
    .returning();

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(schema.project)
    .where(
      and(
        eq(schema.project.id, id),
        eq(schema.project.userId, session.user.id),
      ),
    )
    .returning();

  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
