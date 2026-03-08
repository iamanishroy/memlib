import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { project } from "./project";

/**
 * Permission levels (stored as integer):
 *   1 = read
 *   2 = write
 *   3 = admin
 */
export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    permission: integer("permission").notNull().default(1), // 1=read, 2=read & write, 3=admin
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("api_key_project_id_idx").on(table.projectId)],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  project: one(project, {
    fields: [apiKey.projectId],
    references: [project.id],
  }),
}));

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
