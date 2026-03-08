import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    databaseUrl: text("database_url").notNull(),
    embeddingProvider: text("embedding_provider").notNull(), // 'gemini' | 'openai'
    embeddingApiKey: text("embedding_api_key").notNull(),
    llmProvider: text("llm_provider").notNull(), // 'openai' | 'gemini' | 'anthropic'
    llmApiKey: text("llm_api_key").notNull(),
    llmModel: text("llm_model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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
