// ─── Configuration ────────────────────────────────────────────────

export interface MemZConfig {
  /** API key for authentication (e.g. "sk_...") */
  apiKey: string;
  /** Base URL of the MemZ API. Defaults to "https://memz-api.anishroy.com" */
  baseUrl?: string;
}

// ─── Request Options ──────────────────────────────────────────────

export interface StoreOptions {
  /** Namespace to store the memory in */
  namespace: string;
  /** Text content of the memory */
  content: string;
  /** Optional tags for categorisation */
  tags?: string[];
  /** Optional key-value metadata */
  metadata?: Record<string, unknown>;
  /** Optional time-to-live in seconds */
  ttl?: number;
}

export interface BatchStoreOptions {
  /** Namespace to store the memories in */
  namespace: string;
  /** Array of memories to store */
  memories: Array<{
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ttl?: number;
  }>;
}

export interface ListOptions {
  /** Namespace to list memories from */
  namespace: string;
  /** Maximum number of memories to return */
  limit?: number;
}

export interface RecallOptions {
  /** Namespace to search in */
  namespace: string;
  /** Semantic search query */
  query: string;
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
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number | null;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  accessCount: number | null;
  expiresAt: string | null;
  deduplicated?: boolean;
}

export interface RetrievedMemory {
  id: string;
  namespace: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number | null;
  similarity: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  accessCount: number | null;
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
