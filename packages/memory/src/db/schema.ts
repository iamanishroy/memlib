import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  jsonb,
  boolean,
  index,
  customType,
} from "drizzle-orm/pg-core";

// Custom pgvector type for Drizzle
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

// ─── Memories Table ───────────────────────────────────────────────

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespace: text("namespace").notNull(),
    entity: text("entity").notNull().default("default"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    importance: real("importance").default(0.5),
    category: text("category"),
    tags: text("tags").array().$type<string[]>().default([]),
    memoryType: text("memory_type"),
    source: text("source"),
    archived: boolean("archived").default(false),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    lastAccessed: timestamp("last_accessed").defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("idx_memories_ns_entity_created").on(
      table.namespace,
      table.entity,
      table.createdAt,
    ),
    index("idx_memories_category").on(table.category),
  ],
);

// ─── Memory Events (Audit Trail) ─────────────────────────────────

export const memoryEvents = pgTable(
  "memory_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id").notNull(),
    namespace: text("namespace").notNull(),
    entity: text("entity"),
    event: text("event").notNull(), // ADD, UPDATE, DELETE, MERGE, SKIP_DUPLICATE, KEEP_EXISTING
    oldContent: text("old_content"),
    newContent: text("new_content"),
    mergedFromId: uuid("merged_from_id"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_memory_events_memory_id").on(table.memoryId),
    index("idx_memory_events_namespace").on(table.namespace),
  ],
);

// ─── Types ────────────────────────────────────────────────────────

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type MemoryEvent = typeof memoryEvents.$inferSelect;
export type NewMemoryEvent = typeof memoryEvents.$inferInsert;
