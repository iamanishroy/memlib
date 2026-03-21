import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "@memlib/db/schema/index";
import { createMemoryService } from "@memlib/memory";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the project to get the database URL
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

  try {
    const memory = createMemoryService({
      database: { connectionString: project.databaseUrl },
      embedding: {
        provider: project.embeddingProvider as "gemini" | "openai",
        apiKey: project.embeddingApiKey,
      },
      llm: {
        provider: project.llmProvider as "gemini" | "openai" | "anthropic",
        apiKey: project.llmApiKey,
        model: project.llmModel,
      },
    });

    await memory.migrate();
    await memory.close();

    return Response.json({
      ok: true,
      message: "Migration completed successfully",
    });
  } catch (error) {
    return Response.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 },
    );
  }
}
