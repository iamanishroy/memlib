import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveApiKey, type ApiKeyInfo } from "@memlib/api/context";
import { createMemoryService, type MemoryService } from "@memlib/memory";
import pg from "pg";
import { registerTools, type Scope, type ToolFilter } from "@/lib/mcp/tools";

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
        provider: proj.embeddingProvider,
        apiKey: proj.embeddingApiKey,
      },
      llm: {
        provider: proj.llmProvider,
        apiKey: proj.llmApiKey,
        model: proj.llmModel,
      },
    });
  } finally {
    await client.end();
  }
}

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

// ─── Auth & Scope Resolution ─────────────────────────────────────

async function authenticate(headers: Headers): Promise<ApiKeyInfo> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not configured");

  const apiKeyInfo = await resolveApiKey(headers, databaseUrl);
  if (!apiKeyInfo) throw new Error("Unauthorized");
  return apiKeyInfo;
}

function resolveScope(headers: Headers): Scope {
  const namespace = headers.get("x-memlib-namespace");
  const entity = headers.get("x-memlib-entity");

  if (namespace && entity) {
    return { locked: true, namespace, entity };
  }
  return { locked: false, namespace: null, entity: null };
}

function resolveToolFilter(url: string): ToolFilter {
  const { searchParams } = new URL(url);
  const include = searchParams.get("includeTools");
  const exclude = searchParams.get("excludeTools");
  return {
    include: include ? include.split(",").map((s) => s.trim()) : undefined,
    exclude: exclude ? exclude.split(",").map((s) => s.trim()) : undefined,
  };
}

// ─── JSON-RPC Error Helpers ──────────────────────────────────────

function jsonRpcError(code: number, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

// ─── Shared Request Handler ──────────────────────────────────────

async function handleMcpRequest(req: Request): Promise<Response> {
  const apiKey = await authenticate(req.headers);
  const scope = resolveScope(req.headers);
  const toolFilter = resolveToolFilter(req.url);
  const databaseUrl = process.env.DATABASE_URL!;

  const server = new McpServer(
    { name: "memlib", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const boundWithService = <T>(
    fn: (service: MemoryService) => Promise<T>,
  ): Promise<T> => withService(apiKey.projectId, databaseUrl, fn);

  registerTools(server, scope, boundWithService, toolFilter);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

// ─── Route Handlers ──────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  try {
    return await handleMcpRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return jsonRpcError(-32001, "Unauthorized — invalid API key", 401);
    }

    console.error("[MCP] Error:", error);
    return jsonRpcError(-32603, "Internal server error", 500);
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    return await handleMcpRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return new Response("Unauthorized", { status: 401 });
    }

    console.error("[MCP] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  return new Response(null, { status: 405 });
}
