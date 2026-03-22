import type { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./db/schema";

export interface MemoryConfig {
  database: {
    connectionString: string;
  };
  embedding: {
    provider: string;
    apiKey: string;
    model?: string;
    dimensions?: number;
    baseUrl?: string;
  };
  llm: {
    provider: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/** Internal dependencies wired by the factory */
export interface MemoryDeps {
  pool: Pool;
  db: NodePgDatabase<typeof schema>;
  generateEmbedding: (text: string) => Promise<number[]>;
  generateText: (prompt: string) => Promise<string>;
}
