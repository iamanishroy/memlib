import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { MemoryConfig, MemoryDeps } from "./config";
import * as schema from "./db/schema";
import { createEmbeddingFn } from "./services/embedding";
import { createTextFn } from "./services/llm";
import {
  storeMemory as _storeMemory,
  storeSmartMemory as _storeSmartMemory,
  storeMemories as _storeMemories,
  getMemories as _getMemories,
  deleteMemory as _deleteMemory,
  getMemoryEvents as _getMemoryEvents,
  type StoreMemoryOptions,
  type StoreSmartOptions,
  type StoreResult,
} from "./services/memory";
import {
  retrieveMemories as _retrieveMemories,
  type RecallOptions,
} from "./services/retrieval";
import { consolidateMemories as _consolidateMemories } from "./services/consolidation";

import type { Memory, MemoryEvent } from "./db/schema";
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
  /**
   * Store a single memory (raw, no inference).
   * Deduplicates by cosine similarity > 0.95.
   */
  store(
    namespace: string,
    entity: string,
    content: string,
    options?: StoreMemoryOptions,
  ): Promise<SafeMemory & { deduplicated?: boolean }>;

  /**
   * Smart store — extracts facts via LLM, deduplicates with tiered thresholds,
   * resolves conflicts, and logs all events.
   */
  smartStore(
    namespace: string,
    entity: string,
    content: string,
    options?: StoreSmartOptions,
  ): Promise<StoreResult>;

  /** Batch store memories (raw, no inference) */
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
  list(
    namespace: string,
    entity?: string,
    limit?: number,
  ): Promise<SafeMemory[]>;

  /** Delete a memory by ID (with audit trail logging) */
  delete(id: string): Promise<void>;

  /** Semantic recall with hybrid scoring, scoped to namespace + entity */
  recall(
    namespace: string,
    entity: string,
    query: string,
    options?: RecallOptions | number,
  ): Promise<RetrievedMemory[]>;

  /** Consolidate old memories (category-aware grouping) */
  consolidate(
    ageDays?: number,
    limit?: number,
  ): Promise<ConsolidationResult[]>;

  /** Get audit trail events for a namespace */
  events(
    namespace: string,
    memoryId?: string,
    limit?: number,
  ): Promise<MemoryEvent[]>;

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
      const result = await _storeMemory(
        deps,
        namespace,
        entity,
        content,
        options,
      );
      return stripEmbedding(result);
    },

    smartStore: async (namespace, entity, content, options) => {
      return _storeSmartMemory(deps, namespace, entity, content, options);
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

    consolidate: (ageDays, limit) =>
      _consolidateMemories(deps, ageDays, limit),

    events: (namespace, memoryId, limit) =>
      _getMemoryEvents(deps, namespace, memoryId, limit),

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
          category TEXT,
          tags TEXT[] DEFAULT '{}',
          memory_type TEXT,
          source TEXT,
          archived BOOLEAN DEFAULT false,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          last_accessed TIMESTAMP DEFAULT NOW(),
          metadata JSONB
        )
      `);

      // Create memory_events table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS memory_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          memory_id UUID NOT NULL,
          namespace TEXT NOT NULL,
          entity TEXT,
          event TEXT NOT NULL,
          old_content TEXT,
          new_content TEXT,
          merged_from_id UUID,
          reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_ns_entity_created
        ON memories (namespace, entity, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_archived_created
        ON memories (archived, created_at)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_category
        ON memories (category)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memory_events_memory_id
        ON memory_events (memory_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memory_events_namespace
        ON memory_events (namespace)
      `);

      // Add new columns if they don't exist (safe for existing tables)
      await pool.query(`
        DO $$ BEGIN
          ALTER TABLE memories ADD COLUMN IF NOT EXISTS category TEXT;
          ALTER TABLE memories ADD COLUMN IF NOT EXISTS source TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
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
