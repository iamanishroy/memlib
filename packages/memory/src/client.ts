import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { MemoryConfig, MemoryDeps } from "./config";
import * as schema from "./db/schema";
import { createEmbeddingFn } from "./services/embedding";
import { createTextFn } from "./services/llm";
import {
  storeMemory as _storeMemory,
  storeMemories as _storeMemories,
  getMemories as _getMemories,
  deleteMemory as _deleteMemory,
  type StoreMemoryOptions,
} from "./services/memory";
import {
  retrieveMemories as _retrieveMemories,
  type RecallOptions,
} from "./services/retrieval";
import { consolidateMemories as _consolidateMemories } from "./services/consolidation";

import type { Memory } from "./db/schema";
import type { RetrievedMemory } from "./services/retrieval";
import type { ConsolidationResult } from "./services/consolidation";

const { Pool } = pg;

/** Memory without the embedding vector (internal data) */
export type SafeMemory = Omit<Memory, "embedding">;

function stripEmbedding<T extends { embedding?: unknown }>(
  obj: T,
): Omit<T, "embedding"> {
  const { embedding: _, ...rest } = obj;
  return rest;
}

export interface MemoryService {
  /** Store a single memory */
  store(
    namespace: string,
    entity: string,
    content: string,
    options?: StoreMemoryOptions,
  ): Promise<SafeMemory & { deduplicated?: boolean }>;

  /** Batch store memories */
  batchStore(
    namespace: string,
    entity: string,
    items: {
      content: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      ttl?: number;
    }[],
  ): Promise<SafeMemory[]>;

  /** List memories in a namespace, optionally filtered by entity */
  list(namespace: string, entity?: string, limit?: number): Promise<SafeMemory[]>;

  /** Delete a memory by ID */
  delete(id: string): Promise<void>;

  /** Semantic recall with hybrid scoring, scoped to namespace + entity */
  recall(
    namespace: string,
    entity: string,
    query: string,
    options?: RecallOptions | number,
  ): Promise<RetrievedMemory[]>;

  /** Consolidate old memories */
  consolidate(ageDays?: number, limit?: number): Promise<ConsolidationResult[]>;

  /** Run migrations to set up the memories table + pgvector */
  migrate(): Promise<void>;

  /** Health check — verifies DB connectivity */
  health(): Promise<{ status: string; db: string }>;

  /** Close the connection pool */
  close(): Promise<void>;
}

/**
 * Create a memory service instance bound to a specific project's config.
 */
export function createMemoryService(config: MemoryConfig): MemoryService {
  const pool = new Pool({
    connectionString: config.database.connectionString,
    max: 1,
    idleTimeoutMillis: 0,
  });

  const db = drizzle(pool, { schema });
  const generateEmbedding = createEmbeddingFn(config.embedding);
  const generateText = createTextFn(config.llm);

  const deps: MemoryDeps = { pool, db, generateEmbedding, generateText };

  return {
    store: async (namespace, entity, content, options) => {
      const result = await _storeMemory(deps, namespace, entity, content, options);
      return stripEmbedding(result);
    },

    batchStore: async (namespace, entity, items) => {
      const result = await _storeMemories(deps, namespace, entity, items);
      return result.map(stripEmbedding);
    },

    list: async (namespace, entity, limit) => {
      const result = await _getMemories(deps, namespace, entity, limit);
      return result.map(stripEmbedding);
    },

    delete: (id) => _deleteMemory(deps, id),

    recall: (namespace, entity, query, options) =>
      _retrieveMemories(deps, namespace, entity, query, options),

    consolidate: (ageDays, limit) => _consolidateMemories(deps, ageDays, limit),

    async migrate() {
      // Enable pgvector extension
      await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

      // Create memories table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          namespace TEXT NOT NULL,
          entity TEXT NOT NULL DEFAULT 'default',
          content TEXT NOT NULL,
          embedding vector(${config.embedding.dimensions ?? 1536}),
          importance REAL DEFAULT 0.5,
          tags TEXT[] DEFAULT '{}',
          memory_type TEXT,
          archived BOOLEAN DEFAULT false,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          last_accessed TIMESTAMP DEFAULT NOW(),
          metadata JSONB
        )
      `);

      // Primary access pattern: namespace + entity + recent (partial, skip archived)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_ns_entity_created
        ON memories (namespace, entity, created_at DESC)
      `);

      // Consolidation: find old unarchived memories
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_archived_created
        ON memories (archived, created_at)
      `);

      console.log("✅ Memory tables migrated successfully");
    },

    async health() {
      try {
        await pool.query("SELECT 1");
        return { status: "ok", db: "ok" };
      } catch {
        return { status: "degraded", db: "error" };
      }
    },

    async close() {
      await pool.end();
    },
  };
}
