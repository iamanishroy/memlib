import type { MemoryDeps } from "../config";

// ─── Types ────────────────────────────────────────────────────────

export interface DiffOptions {
  /** Return changes after this ISO timestamp */
  since: string | Date;
  /** Max events to return (default 200) */
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
  category: string | null;
  updatedAt: string;
}

export interface DiffDeleted {
  id: string;
  content: string;
  deletedAt: string;
}

export interface DiffReplaced {
  oldId: string;
  oldContent: string;
  newId: string;
  newContent: string;
  category: string | null;
  reason: string;
  replacedAt: string;
}

export interface DiffResult {
  created: DiffCreated[];
  updated: DiffUpdated[];
  deleted: DiffDeleted[];
  replaced: DiffReplaced[];
  since: string;
  changeCount: number;
  /** Human-readable summary of the net changes */
  summary: string;
}

// ─── Implementation ──────────────────────────────────────────────

interface EventRow {
  memory_id: string;
  event: string;
  old_content: string | null;
  new_content: string | null;
  reason: string | null;
  created_at: Date;
}

interface MemoryRow {
  id: string;
  category: string | null;
}

/** Track all events for a single memory_id to compute net state */
interface MemoryTimeline {
  wasAdded: boolean;
  wasDeleted: boolean;
  isContradiction: boolean;
  updates: { oldContent: string; newContent: string; at: string }[];
  addContent: string;
  addedAt: string;
  deleteContent: string;
  deletedAt: string;
  deleteReason: string;
}

/**
 * Query the memory_events audit trail for changes since a given timestamp.
 * Collapses events per memory_id to compute the NET diff:
 *  - Created and still alive → shows in created
 *  - Existed before, deleted in window → shows in deleted
 *  - Created then contradiction-deleted → paired with new ADD as "replaced"
 *  - Updated/merged → shows old→new with latest values
 *
 * Zero LLM calls — pure SQL on existing data.
 */
export async function getMemoryDiff(
  deps: Pick<MemoryDeps, "pool">,
  namespace: string,
  entity: string,
  options: DiffOptions,
): Promise<DiffResult> {
  const since =
    options.since instanceof Date ? options.since.toISOString() : options.since;
  const limit = options.limit ?? 200;

  // 1. Fetch all events in the time window (include reason for contradiction detection)
  const { rows } = await deps.pool.query<EventRow>(
    `SELECT memory_id, event, old_content, new_content, reason, created_at
     FROM memory_events
     WHERE namespace = $1 AND entity = $2 AND created_at > $3
     ORDER BY created_at ASC
     LIMIT $4`,
    [namespace, entity, since, limit],
  );

  if (rows.length === 0) {
    return {
      created: [],
      updated: [],
      deleted: [],
      replaced: [],
      since,
      changeCount: 0,
      summary: "No changes",
    };
  }

  // 2. Group events by memory_id → build timeline
  const timelines = new Map<string, MemoryTimeline>();

  for (const row of rows) {
    const ts = row.created_at.toISOString();
    let tl = timelines.get(row.memory_id);

    if (!tl) {
      tl = {
        wasAdded: false,
        wasDeleted: false,
        isContradiction: false,
        updates: [],
        addContent: "",
        addedAt: "",
        deleteContent: "",
        deletedAt: "",
        deleteReason: "",
      };
      timelines.set(row.memory_id, tl);
    }

    switch (row.event) {
      case "ADD":
        tl.wasAdded = true;
        tl.addContent = row.new_content ?? "";
        tl.addedAt = ts;
        break;

      case "UPDATE":
      case "MERGE":
      case "REPLACE":
        tl.updates.push({
          oldContent: row.old_content ?? "",
          newContent: row.new_content ?? "",
          at: ts,
        });
        break;

      case "DELETE":
        tl.wasDeleted = true;
        tl.deleteContent = row.old_content ?? "";
        tl.deletedAt = ts;
        tl.deleteReason = row.reason ?? "";
        if (row.reason?.toLowerCase().includes("contradiction")) {
          tl.isContradiction = true;
        }
        break;
    }
  }

  // 3. Compute net state
  const created: DiffCreated[] = [];
  const updated: DiffUpdated[] = [];
  const deleted: DiffDeleted[] = [];
  const replaced: DiffReplaced[] = [];
  const survivingIds: string[] = [];

  // Track contradiction-deleted IDs to pair with their replacement ADDs
  const contradictionDeletes: { id: string; content: string; at: string }[] =
    [];
  // Track ADDs that might be contradiction replacements (not yet confirmed as paired)
  const candidateAdds = new Map<
    string,
    { id: string; content: string; at: string }
  >();

  for (const [id, tl] of timelines) {
    // Contradiction delete → collect for pairing
    if (tl.wasDeleted && tl.isContradiction) {
      contradictionDeletes.push({
        id,
        content: tl.deleteContent,
        at: tl.deletedAt,
      });

      // If it was also added in the window, it means it was transient (created + contradicted)
      // so we just note the contradiction delete for pairing
      continue;
    }

    if (tl.wasAdded && tl.wasDeleted) {
      // Created then deleted (non-contradiction) in same window → net zero
      continue;
    }

    if (tl.wasAdded && !tl.wasDeleted) {
      // Net new memory — resolve final content through any updates
      const finalContent =
        tl.updates.length > 0
          ? tl.updates[tl.updates.length - 1]!.newContent
          : tl.addContent;
      // Store as candidate ADD for potential contradiction pairing
      candidateAdds.set(id, { id, content: finalContent, at: tl.addedAt });
      continue;
    }

    if (!tl.wasAdded && tl.wasDeleted) {
      // Existed before window, deleted in window (non-contradiction)
      deleted.push({ id, content: tl.deleteContent, deletedAt: tl.deletedAt });
      continue;
    }

    // Not added, not deleted — must have updates/merges
    if (tl.updates.length > 0) {
      const first = tl.updates[0]!;
      const last = tl.updates[tl.updates.length - 1]!;
      updated.push({
        id,
        content: last.newContent,
        previousContent: first.oldContent,
        category: null,
        updatedAt: last.at,
      });
      survivingIds.push(id);
    }
  }

  // 4. Pair contradiction deletes with their replacement ADDs
  //    Match by closest timestamp: each contradiction DELETE is followed by an ADD
  const pairedAddIds = new Set<string>();

  for (const del of contradictionDeletes) {
    const deleteTime = new Date(del.at).getTime();
    let bestMatch: { id: string; content: string; at: string } | null = null;
    let bestDelta = Infinity;

    for (const [addId, add] of candidateAdds) {
      if (pairedAddIds.has(addId)) continue;
      const addTime = new Date(add.at).getTime();
      const delta = Math.abs(addTime - deleteTime);
      // Only pair if within 30 seconds (same smart store call)
      if (delta < 30_000 && delta < bestDelta) {
        bestMatch = add;
        bestDelta = delta;
      }
    }

    if (bestMatch) {
      pairedAddIds.add(bestMatch.id);
      replaced.push({
        oldId: del.id,
        oldContent: del.content,
        newId: bestMatch.id,
        newContent: bestMatch.content,
        category: null,
        reason: "contradiction",
        replacedAt: del.at,
      });
      survivingIds.push(bestMatch.id);
    } else {
      // No matching ADD found — just a plain delete
      deleted.push({ id: del.id, content: del.content, deletedAt: del.at });
    }
  }

  // Remaining unpaired ADDs are genuinely new
  for (const [addId, add] of candidateAdds) {
    if (pairedAddIds.has(addId)) continue;
    created.push({
      id: add.id,
      content: add.content,
      category: null,
      createdAt: add.at,
    });
    survivingIds.push(add.id);
  }

  // 5. Enrich with category from memories table for surviving IDs
  if (survivingIds.length > 0) {
    const placeholders = survivingIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: memRows } = await deps.pool.query<MemoryRow>(
      `SELECT id, category FROM memories WHERE id IN (${placeholders})`,
      survivingIds,
    );
    const catMap = new Map(memRows.map((r) => [r.id, r.category]));

    for (const c of created) c.category = catMap.get(c.id) ?? null;
    for (const u of updated) u.category = catMap.get(u.id) ?? null;
    for (const r of replaced) r.category = catMap.get(r.newId) ?? null;
  }

  // 6. Build summary
  const parts: string[] = [];
  if (created.length > 0) parts.push(`${created.length} new`);
  if (updated.length > 0) parts.push(`${updated.length} updated`);
  if (replaced.length > 0) parts.push(`${replaced.length} replaced`);
  if (deleted.length > 0) parts.push(`${deleted.length} removed`);
  const summary = parts.length > 0 ? parts.join(", ") : "No changes";

  return {
    created,
    updated,
    deleted,
    replaced,
    since,
    changeCount:
      created.length + updated.length + deleted.length + replaced.length,
    summary,
  };
}
