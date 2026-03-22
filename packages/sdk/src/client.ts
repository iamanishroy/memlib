import { MemLibError } from "./errors";
import type {
  MemLibConfig,
  StoreOptions,
  BatchStoreOptions,
  ListOptions,
  RecallOptions,
  PrepareOptions,
  DiffOptions,
  Memory,
  RetrievedMemory,
  StoreResult,
  BatchStoreResult,
  DeleteResult,
  HealthResult,
  PrepareResult,
  DiffResult,
} from "./types";

const DEFAULT_BASE_URL = "https://mem.anishroy.com/api";

export class MemLib {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultNamespace: string;
  private readonly defaultEntity: string;

  constructor(config: MemLibConfig) {
    if (!config.apiKey) {
      throw new Error("MemLib: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultNamespace = config.namespace ?? "";
    this.defaultEntity = config.entity ?? "";
  }

  // ── Internal ────────────────────────────────────────────────────

  private async _request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string> },
  ): Promise<T> {
    let url = `${this.baseUrl}/v1${path}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.set(key, value);
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body:
        options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }
      throw new MemLibError(
        `MemLib API error: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<T>;
  }

  /** Resolve namespace — per-call override or constructor default */
  private ns(override?: string): string {
    const value = override ?? this.defaultNamespace;
    if (!value) {
      throw new Error(
        "MemLib: namespace is required. Pass it in the constructor or per-call options.",
      );
    }
    return value;
  }

  /** Resolve entity — per-call override or constructor default */
  private ent(override?: string): string {
    const value = override ?? this.defaultEntity;
    if (!value) {
      throw new Error(
        "MemLib: entity is required. Pass it in the constructor or per-call options.",
      );
    }
    return value;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Health check — verify the API is reachable.
   */
  async health(): Promise<HealthResult> {
    return this._request<HealthResult>("GET", "/health");
  }

  /**
   * Store a single memory.
   */
  async store(options: StoreOptions): Promise<StoreResult> {
    return this._request<StoreResult>("POST", "/memory", {
      body: {
        namespace: this.ns(options.namespace),
        entity: this.ent(options.entity),
        content: options.content,
        infer: options.infer,
        tags: options.tags,
        metadata: options.metadata,
        source: options.source,
        ttl: options.ttl,
      },
    });
  }

  /**
   * Batch store multiple memories at once.
   */
  async batchStore(options: BatchStoreOptions): Promise<BatchStoreResult> {
    return this._request<BatchStoreResult>("POST", "/memory/batch", {
      body: {
        namespace: this.ns(options.namespace),
        entity: this.ent(options.entity),
        memories: options.memories,
      },
    });
  }

  /**
   * List memories in a namespace, optionally filtered by entity.
   */
  async list(options: ListOptions = {}): Promise<Memory[]> {
    const params: Record<string, string> = {
      namespace: this.ns(options.namespace),
      entity: this.ent(options.entity),
    };
    if (options.limit !== undefined) {
      params["limit"] = String(options.limit);
    }
    return this._request<Memory[]>("GET", "/memory", { params });
  }

  /**
   * Delete a memory by its UUID.
   */
  async delete(memoryId: string): Promise<DeleteResult> {
    return this._request<DeleteResult>("DELETE", `/memory/${memoryId}`);
  }

  /**
   * Semantic recall — search memories by meaning.
   */
  async recall(options: RecallOptions): Promise<RetrievedMemory[]> {
    return this._request<RetrievedMemory[]>("POST", "/memory/recall", {
      body: {
        namespace: this.ns(options.namespace),
        entity: this.ent(options.entity),
        query: options.query,
        category: options.category,
        limit: options.limit,
        tags: options.tags,
        minImportance: options.minImportance,
      },
    });
  }

  /**
   * Context-aware memory synthesis.
   * Reads conversation, retrieves relevant memories, and returns
   * a synthesized briefing paragraph. 2 LLM calls.
   */
  async prepare(options: PrepareOptions): Promise<PrepareResult> {
    return this._request<PrepareResult>("POST", "/memory/prepare", {
      body: {
        namespace: this.ns(options.namespace),
        entity: this.ent(options.entity),
        messages: options.messages,
        maxCandidates: options.maxCandidates,
        maxTokens: options.maxTokens,
        category: options.category,
      },
    });
  }

  /**
   * Memory diff — returns what changed since a given timestamp.
   * Zero LLM calls, pure audit trail query.
   */
  async diff(options: DiffOptions): Promise<DiffResult> {
    return this._request<DiffResult>("POST", "/memory/diff", {
      body: {
        namespace: this.ns(options.namespace),
        entity: this.ent(options.entity),
        since: options.since,
        limit: options.limit,
      },
    });
  }
}
