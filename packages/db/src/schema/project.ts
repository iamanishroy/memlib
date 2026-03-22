import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    databaseUrl: text("databaseUrl").notNull(),
    embeddingProvider: text("embeddingProvider").notNull(),
    embeddingApiKey: text("embeddingApiKey").notNull(),
    embeddingModel: text("embeddingModel"),
    embeddingBaseUrl: text("embeddingBaseUrl"),
    llmProvider: text("llmProvider").notNull(),
    llmApiKey: text("llmApiKey").notNull(),
    llmModel: text("llmModel").notNull(),
    llmBaseUrl: text("llmBaseUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("project_user_id_idx").on(table.userId)],
);

export const projectRelations = relations(project, ({ one }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
}));
