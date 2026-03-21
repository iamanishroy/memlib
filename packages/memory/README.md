# @memlib/memory

A high-quality, cost-efficient memory service for AI agents. Provides semantic storage, retrieval, conflict resolution, and consolidation — all through a dependency-injected factory pattern that supports multiple LLM and embedding providers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  createMemoryService(config)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ MemoryService (client.ts)                             │  │
│  │  .store()  .smartStore()  .recall()  .consolidate()  │  │
│  │  .batchStore()  .list()  .delete()  .events()        │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │ MemoryDeps (DI)                           │
│  ┌───────────────┼───────────────────────────────────────┐  │
│  │               ▼                                       │  │
│  │  ┌─────────┐  ┌───────────┐  ┌──────────┐           │  │
│  │  │ pool    │  │ db        │  │ LLM fn   │           │  │
│  │  │ (pg)    │  │ (drizzle) │  │ embed fn │           │  │
│  │  └────┬────┘  └─────┬─────┘  └──────────┘           │  │
│  │       │             │                                 │  │
│  │  ┌────▼─────────────▼───────────────────────────┐    │  │
│  │  │ Services                                      │    │  │
│  │  │  extraction.ts  conflict.ts  memory.ts       │    │  │
│  │  │  retrieval.ts   consolidation.ts             │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                    ┌─────▼───────┐                           │
│                    │ PostgreSQL  │                           │
│                    │ + pgvector  │                           │
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Injection

The package uses a **factory pattern** with `MemoryDeps` injection. Every service function takes `deps` as its first argument, making it:

- **Provider-agnostic** — swap Gemini, OpenAI, or Anthropic for LLM/embeddings
- **Fully testable** — inject mock functions in tests, no module-level mocks needed
- **Stateless** — each `createMemoryService()` call is self-contained

```typescript
interface MemoryDeps {
  pool: Pool; // Raw SQL for vector ops
  db: NodePgDatabase<typeof schema>; // Drizzle ORM for typed queries
  generateEmbedding: (text: string) => Promise<number[]>;
  generateText: (prompt: string) => Promise<string>;
}
```

## Quick Start

```typescript
import { createMemoryService } from "@memlib/memory";

const memory = createMemoryService({
  database: { connectionString: process.env.DATABASE_URL },
  embedding: { provider: "gemini", apiKey: process.env.GEMINI_KEY },
  llm: { provider: "gemini", apiKey: process.env.GEMINI_KEY },
});

// Run migrations (one-time setup)
await memory.migrate();

// Smart store: extracts facts, deduplicates, resolves conflicts
const result = await memory.smartStore(
  "project-x",
  "user-alice",
  "I prefer TypeScript over JavaScript. My team uses React and Next.js.",
);
// result.memories = [
//   { content: "Prefers TypeScript over JavaScript", category: "preference", ... },
//   { content: "Team uses React and Next.js", category: "professional", ... }
// ]

// Recall with hybrid scoring
const memories = await memory.recall(
  "project-x",
  "user-alice",
  "What tech stack do they use?",
  { category: "professional", limit: 5 },
);
```

## Store Pipeline

The memory service offers two storage paths:

### Raw Store (`memory.store()`)

Direct storage with basic deduplication. No LLM inference.

```
Content → Embed → Check similarity > 0.95 → Skip (duplicate)
                                           → Insert (new)
```

**Use when:** You already have clean, atomic facts to store.

### Smart Store (`memory.smartStore()`)

The full intelligent pipeline. **2 LLM calls max** (1 always, 1 only when conflicts exist).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Store Pipeline                         │
│                                                                 │
│  ① Content ──→ Extract Facts (1 LLM call)                      │
│                 └─ facts: [{text, importance, category}, ...]   │
│                                                                 │
│  ② Facts ──→ Batch Embed (parallel API calls)                  │
│                                                                 │
│  ③ Per Fact ──→ pgvector Search (namespace + entity scoped)     │
│                  ├─ similarity > 0.95 ──→ SKIP (exact dup)     │
│                  ├─ 0.85 < sim ≤ 0.95 ──→ CONFLICT (resolve)  │
│                  └─ similarity ≤ 0.85 ──→ INSERT (new)         │
│                                                                 │
│  ④ Conflicts ──→ Batch Resolve (1 LLM call, conditional)       │
│                   ├─ MERGE      → combine both into richer     │
│                   ├─ REPLACE    → new supersedes old           │
│                   ├─ KEEP       → old is adequate              │
│                   └─ CONTRADICT → archive old, insert new      │
│                                                                 │
│  ⑤ Execute ──→ INSERT / UPDATE / ARCHIVE + log events          │
└─────────────────────────────────────────────────────────────────┘
```

#### Cost Analysis

| Scenario                   | LLM Calls                 | Typical Cost |
| -------------------------- | ------------------------- | ------------ |
| All new facts, no overlaps | 1 (extraction)            | ~$0.001      |
| Some overlaps detected     | 2 (extraction + conflict) | ~$0.002      |
| All duplicates             | 1 (extraction only)       | ~$0.001      |

The previous architecture used **2 LLM calls per memory** (one for importance scoring, one for content). The new pipeline uses **1 call for N facts** plus a conditional second call.

## Retrieval

Semantic recall with **hybrid scoring**:

```
score = 0.6 × cosine_similarity + 0.2 × recency + 0.2 × importance
```

Supported filters:

- **`entity`** — scope search to a specific entity within a namespace
- **`category`** — filter by fact category (preference, personal, professional, etc.)
- **`tags`** — filter by any matching tag
- **`minImportance`** — minimum importance threshold (0.0–1.0)

```typescript
const results = await memory.recall("ns", "entity", "query", {
  category: "preference",
  tags: ["ui"],
  minImportance: 0.5,
  limit: 10,
});
```

## Consolidation

Automatically summarizes old memories into concise consolidated entries.

**Grouping:** Memories are grouped by `(namespace, entity, category)` for context-aware summaries. This prevents mixing unrelated facts (e.g., work preferences won't be consolidated with health information).

```typescript
const results = await memory.consolidate(
  7, // ageDays — only consolidate memories older than 7 days
  50, // limit — max memories to process per run
);
```

**Process:**

1. Query non-archived memories older than `ageDays`
2. Group by `(namespace, entity, category)`
3. Skip groups with < 2 memories
4. Summarize each group via LLM
5. Insert consolidated memory, archive originals

## Audit Trail

Every memory mutation is logged to the `memory_events` table:

| Event            | When                                     |
| ---------------- | ---------------------------------------- |
| `ADD`            | New memory inserted                      |
| `MERGE`          | Two memories combined                    |
| `REPLACE`        | New fact superseded old                  |
| `DELETE`         | Memory deleted (manual or contradiction) |
| `SKIP_DUPLICATE` | Near-duplicate detected, skipped         |
| `KEEP_EXISTING`  | Conflict resolved in favor of existing   |

```typescript
const events = await memory.events("project-x", optionalMemoryId, limit);
```

## Database Schema

### `memories` table

| Column          | Type         | Description                                  |
| --------------- | ------------ | -------------------------------------------- |
| `id`            | UUID         | Primary key                                  |
| `namespace`     | TEXT         | Project/tenant scope                         |
| `entity`        | TEXT         | Entity within namespace (default: "default") |
| `content`       | TEXT         | The memory content                           |
| `embedding`     | vector(1536) | pgvector embedding                           |
| `importance`    | REAL         | 0.0–1.0 importance score                     |
| `category`      | TEXT         | Fact category (preference, personal, etc.)   |
| `tags`          | TEXT[]       | User-defined tags                            |
| `source`        | TEXT         | Origin of the memory                         |
| `archived`      | BOOLEAN      | Whether consolidated/superseded              |
| `expires_at`    | TIMESTAMP    | Optional TTL expiration                      |
| `created_at`    | TIMESTAMP    | Creation timestamp                           |
| `last_accessed` | TIMESTAMP    | Updated on retrieval                         |
| `metadata`      | JSONB        | Arbitrary metadata                           |

### `memory_events` table

| Column           | Type      | Description                    |
| ---------------- | --------- | ------------------------------ |
| `id`             | UUID      | Primary key                    |
| `memory_id`      | UUID      | Reference to memory            |
| `namespace`      | TEXT      | For efficient querying         |
| `entity`         | TEXT      | Entity context                 |
| `event`          | TEXT      | Event type (ADD, MERGE, etc.)  |
| `old_content`    | TEXT      | Previous content (for updates) |
| `new_content`    | TEXT      | New content                    |
| `merged_from_id` | UUID      | Source memory (for merges)     |
| `reason`         | TEXT      | Human-readable explanation     |
| `created_at`     | TIMESTAMP | Event timestamp                |

## API

### `MemoryService` Interface

```typescript
interface MemoryService {
  // Storage
  store(ns, entity, content, opts?): Promise<SafeMemory>;
  smartStore(ns, entity, content, opts?): Promise<StoreResult>;
  batchStore(ns, entity, items): Promise<SafeMemory[]>;

  // Retrieval
  list(ns, entity?, limit?): Promise<SafeMemory[]>;
  recall(ns, entity, query, opts?): Promise<RetrievedMemory[]>;

  // Management
  delete(id): Promise<void>;
  consolidate(ageDays?, limit?): Promise<ConsolidationResult[]>;
  events(ns, memoryId?, limit?): Promise<MemoryEvent[]>;

  // Setup
  migrate(): Promise<void>;
  health(): Promise<{ status: string; db: string }>;
  close(): Promise<void>;
}
```

### Configuration

```typescript
interface MemoryConfig {
  database: {
    connectionString: string;
  };
  embedding: {
    provider: "gemini" | "openai";
    apiKey: string;
    dimensions?: number; // default: 1536
  };
  llm: {
    provider: "gemini" | "openai" | "anthropic";
    apiKey: string;
    model?: string; // default: provider-specific
  };
}
```

## Project Structure

```
packages/memory/
├── src/
│   ├── client.ts           # Factory + MemoryService interface
│   ├── config.ts           # MemoryConfig + MemoryDeps types
│   ├── index.ts            # Public exports
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema (memories + memory_events)
│   │   └── index.ts        # DB re-exports
│   ├── services/
│   │   ├── extraction.ts   # LLM fact extraction (1 call → facts + importance + category)
│   │   ├── conflict.ts     # Batched conflict resolution (MERGE/REPLACE/KEEP/CONTRADICT)
│   │   ├── memory.ts       # Core store pipeline (raw + smart + events)
│   │   ├── retrieval.ts    # Hybrid semantic search with filters
│   │   ├── consolidation.ts # Category-aware memory summarization
│   │   ├── embedding.ts    # Multi-provider embedding (Gemini/OpenAI)
│   │   ├── llm.ts          # Multi-provider LLM (Gemini/OpenAI/Anthropic)
│   │   └── importance.ts   # [deprecated] Replaced by extraction.ts
│   └── __tests__/
│       ├── memory.test.ts
│       ├── retrieval.test.ts
│       └── consolidation.test.ts
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```
