import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "@memlib/db/schema/index";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.userId, session.user.id));

  return Response.json(projects);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, string>;
  const {
    name,
    databaseUrl,
    embeddingProvider,
    embeddingApiKey,
    llmProvider,
    llmApiKey,
    llmModel,
  } = body;

  if (
    !name ||
    !databaseUrl ||
    !embeddingProvider ||
    !embeddingApiKey ||
    !llmProvider ||
    !llmApiKey ||
    !llmModel
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  const [project] = await db
    .insert(schema.project)
    .values({
      id,
      name,
      userId: session.user.id,
      databaseUrl,
      embeddingProvider,
      embeddingApiKey,
      llmProvider,
      llmApiKey,
      llmModel,
    })
    .returning();

  return Response.json(project, { status: 201 });
}
