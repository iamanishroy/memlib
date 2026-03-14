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
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    importance: real("importance").default(0.5),
    tags: text("tags").array().$type<string[]>().default([]),
    memoryType: text("memory_type"),
    archived: boolean("archived").default(false),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    lastAccessed: timestamp("last_accessed").defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("idx_memories_ns_archived_created").on(
      table.namespace,
      table.archived,
      table.createdAt,
    ),
  ],
);

// ─── Types ────────────────────────────────────────────────────────

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
