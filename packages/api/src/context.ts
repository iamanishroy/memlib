import { auth } from "@memz/auth";
import { createHash } from "crypto";
import pg from "pg";
import type { Context as HonoContext } from "hono";

const { Client } = pg;

// ─── Types ────────────────────────────────────────────────────────

export type ApiKeyInfo = {
  id: string;
  projectId: string;
  permission: number; // 1=read, 2=read&write, 3=admin
};

export type CreateContextOptions = {
  context: HonoContext;
};

// ─── Context Factory ──────────────────────────────────────────────
// NOTE: No DB queries here — keep this fast for every request.
// API key resolution happens lazily in apiKeyProcedure using
// an ephemeral pg.Client (connect → query → end).

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  return {
    session,
    headers: context.req.raw.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// ─── API Key Resolution (ephemeral connection per call) ───────────

export async function resolveApiKey(
  headers: Headers,
  databaseUrl: string,
): Promise<ApiKeyInfo | null> {
  const authorization = headers.get("authorization");
  if (!authorization) return null;

  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token.startsWith("sk_")) return null;

  const hash = createHash("sha256").update(token).digest("hex");

  // Use ephemeral pg.Client — connect, query, disconnect.
  // No persistent Pool needed for Workers.
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, project_id, permission, revoked_at
       FROM api_key
       WHERE key_hash = $1
       LIMIT 1`,
      [hash],
    );

    const row = result.rows[0];
    if (!row || row.revoked_at) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      permission: row.permission,
    };
  } finally {
    await client.end();
  }
}
