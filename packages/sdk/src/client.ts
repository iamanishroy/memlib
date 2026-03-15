import { MemZError } from "./errors";
import type {
  MemZConfig,
  StoreOptions,
  BatchStoreOptions,
  ListOptions,
  RecallOptions,
  Memory,
  RetrievedMemory,
  StoreResult,
  BatchStoreResult,
  DeleteResult,
  HealthResult,
} from "./types";

const DEFAULT_BASE_URL = "https://memz-api.anishroy.com";

export class MemZ {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultNamespace: string;
  private readonly defaultEntity: string;

  constructor(config: MemZConfig) {
    if (!config.apiKey) {
      throw new Error("MemZ: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultNamespace = config.namespace ?? "default";
    this.defaultEntity = config.entity ?? "default";
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
      throw new MemZError(
        `MemZ API error: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<T>;
  }

  /** Resolve namespace — per-call override or constructor default */
  private ns(override?: string): string {
    return override ?? this.defaultNamespace;
  }

  /** Resolve entity — per-call override or constructor default */
  private ent(override?: string): string {
    return override ?? this.defaultEntity;
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
}
