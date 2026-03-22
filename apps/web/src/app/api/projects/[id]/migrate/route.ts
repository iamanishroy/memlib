import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "@memlib/db/schema/index";
import { createMemoryService } from "@memlib/memory";
import { getEmbeddingProvider } from "@memlib/ai";

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
    // Resolve embedding dimensions from the selected model
    const embProvider = getEmbeddingProvider(project.embeddingProvider);
    const embModel = project.embeddingModel
      ? embProvider?.models.find((m) => m.id === project.embeddingModel)
      : embProvider?.models.find((m) => m.default) ?? embProvider?.models[0];
    const dimensions = embModel?.dimensions ?? 1536;

    const memory = createMemoryService({
      database: { connectionString: project.databaseUrl },
      embedding: {
        provider: project.embeddingProvider,
        apiKey: project.embeddingApiKey,
        model: project.embeddingModel ?? undefined,
        baseUrl: project.embeddingBaseUrl ?? undefined,
        dimensions,
      },
      llm: {
        provider: project.llmProvider,
        apiKey: project.llmApiKey,
        model: project.llmModel,
        baseUrl: project.llmBaseUrl ?? undefined,
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
