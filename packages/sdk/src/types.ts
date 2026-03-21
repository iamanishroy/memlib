// ─── Configuration ────────────────────────────────────────────────

export interface MemLibConfig {
  /** API key for authentication (e.g. "sk_...") */
  apiKey: string;
  /** Base URL of the MemLib API. Defaults to "https://mem.anishroy.com/api" */
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
  /** If true (default), use smart store with LLM fact extraction. If false, raw store. */
  infer?: boolean;
  /** Optional tags for categorisation */
  tags?: string[];
  /** Optional key-value metadata */
  metadata?: Record<string, unknown>;
  /** Optional source identifier (e.g. "conversation", "api") */
  source?: string;
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
  /** Filter by category (e.g. "preference", "personal", "professional") */
  category?: string;
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
  category: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number | null;
  source: string | null;
  createdAt: string;
  lastAccessed: string | null;
  expiresAt: string | null;
  deduplicated?: boolean;
}

export interface RetrievedMemory {
  id: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number;
  similarity: number;
  recency: number;
  score: number;
}

export interface StoreResult {
  memories: (Memory & { event: string })[];
  skipped: number;
  conflicts: number;
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

// ─── Prepare (Context-Aware Synthesis) ────────────────────────────

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PrepareOptions {
  /** Conversation messages for context */
  messages: Message[];
  /** Namespace (overrides constructor default) */
  namespace?: string;
  /** Entity identifier */
  entity?: string;
  /** Max memories to consider (default 20) */
  maxCandidates?: number;
  /** Max tokens in the output context */
  maxTokens?: number;
  /** Filter by category */
  category?: string;
}

export interface PrepareResult {
  /** Synthesized context paragraph, ready to inject into a system prompt */
  context: string;
  /** IDs of memories used in the synthesis */
  memoriesUsed: string[];
  /** Number of candidate memories considered */
  candidatesConsidered: number;
  /** Estimated token count of the context */
  tokenCount: number;
}
