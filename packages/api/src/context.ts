import { createHash } from "crypto";
import pg from "pg";

const { Client } = pg;

// ─── Types ────────────────────────────────────────────────────────

export type ApiKeyInfo = {
  id: string;
  projectId: string;
  permission: number; // 1=read, 2=read&write, 3=admin
};

export type Session = {
  user: { id: string; name: string; email: string; [key: string]: unknown };
  session: { id: string; [key: string]: unknown };
};

export type Context = {
  session: Session | null;
  headers: Headers;
  databaseUrl?: string;
};

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
