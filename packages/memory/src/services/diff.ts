import type { MemoryDeps } from "../config";

// ─── Types ────────────────────────────────────────────────────────

export interface DiffOptions {
  /** Return changes after this ISO timestamp */
  since: string | Date;
  /** Max events to return (default 100) */
  limit?: number;
}

export interface DiffCreated {
  id: string;
  content: string;
  category: string | null;
  createdAt: string;
}

export interface DiffUpdated {
  id: string;
  content: string;
  previousContent: string;
  updatedAt: string;
}

export interface DiffDeleted {
  id: string;
  content: string;
  deletedAt: string;
}

export interface DiffResult {
  created: DiffCreated[];
  updated: DiffUpdated[];
  deleted: DiffDeleted[];
  since: string;
  changeCount: number;
}

// ─── Implementation ──────────────────────────────────────────────

interface EventRow {
  memory_id: string;
  event: string;
  old_content: string | null;
  new_content: string | null;
  created_at: Date;
}

/**
 * Query the memory_events audit trail for changes since a given timestamp.
 * Zero LLM calls — pure SQL query on existing data.
 */
export async function getMemoryDiff(
  deps: Pick<MemoryDeps, "pool">,
  namespace: string,
  entity: string,
  options: DiffOptions,
): Promise<DiffResult> {
  const since =
    options.since instanceof Date ? options.since.toISOString() : options.since;
  const limit = options.limit ?? 100;

  const { rows } = await deps.pool.query<EventRow>(
    `SELECT memory_id, event, old_content, new_content, created_at
     FROM memory_events
     WHERE namespace = $1 AND entity = $2 AND created_at > $3
     ORDER BY created_at ASC
     LIMIT $4`,
    [namespace, entity, since, limit],
  );

  const created: DiffCreated[] = [];
  const updated: DiffUpdated[] = [];
  const deleted: DiffDeleted[] = [];

  for (const row of rows) {
    const ts = row.created_at.toISOString();

    switch (row.event) {
      case "ADD":
        created.push({
          id: row.memory_id,
          content: row.new_content ?? "",
          category: null,
          createdAt: ts,
        });
        break;

      case "UPDATE":
      case "MERGE":
        updated.push({
          id: row.memory_id,
          content: row.new_content ?? "",
          previousContent: row.old_content ?? "",
          updatedAt: ts,
        });
        break;

      case "DELETE":
        deleted.push({
          id: row.memory_id,
          content: row.old_content ?? "",
          deletedAt: ts,
        });
        break;
    }
  }

  return {
    created,
    updated,
    deleted,
    since,
    changeCount: created.length + updated.length + deleted.length,
  };
}
