// ─── Configuration ────────────────────────────────────────────────

export interface MemZConfig {
  /** API key for authentication (e.g. "sk_...") */
  apiKey: string;
  /** Base URL of the MemZ API. Defaults to "https://memz-api.anishroy.com" */
  baseUrl?: string;
  /** Default namespace for all operations. Can be overridden per call. */
  namespace?: string;
  /** Default entity for all operations. Can be overridden per call. */
  entity?: string;
}

// ─── Request Options ──────────────────────────────────────────────

export interface StoreOptions {
  /** Text content of the memory */
  content: string;
  /** Namespace (overrides constructor default) */
  namespace?: string;
  /** Entity identifier (e.g. user ID, session ID) */
  entity?: string;
  /** Optional tags for categorisation */
  tags?: string[];
  /** Optional key-value metadata */
  metadata?: Record<string, unknown>;
  /** Optional time-to-live in seconds */
  ttl?: number;
}

export interface BatchStoreOptions {
  /** Namespace (overrides constructor default) */
  namespace?: string;
  /** Entity identifier */
  entity?: string;
  /** Array of memories to store */
  memories: Array<{
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ttl?: number;
  }>;
}

export interface ListOptions {
  /** Namespace (overrides constructor default) */
  namespace?: string;
  /** Optional entity filter */
  entity?: string;
  /** Maximum number of memories to return */
  limit?: number;
}

export interface RecallOptions {
  /** Semantic search query */
  query: string;
  /** Namespace (overrides constructor default) */
  namespace?: string;
  /** Entity identifier */
  entity?: string;
  /** Maximum number of results */
  limit?: number;
  /** Filter by tags */
  tags?: string[];
  /** Minimum importance score */
  minImportance?: number;
}

// ─── Response Types ───────────────────────────────────────────────

export interface Memory {
  id: string;
  namespace: string;
  entity: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number | null;
  createdAt: string;
  lastAccessed: string | null;
  expiresAt: string | null;
  deduplicated?: boolean;
}

export interface RetrievedMemory {
  id: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number;
  similarity: number;
  recency: number;
  score: number;
}

export interface BatchStoreResult {
  count: number;
  memories: Memory[];
}

export interface DeleteResult {
  deleted: boolean;
}

export interface HealthResult {
  status: string;
  [key: string]: unknown;
}
