# memlib

TypeScript SDK for the MemLib memory API — store, recall, and manage AI agent memories with semantic search, smart deduplication, and automatic fact extraction.

## Installation

```bash
npm install memlib
```

## Quick Start

```typescript
import { MemLib } from "memlib";

const mem = new MemLib({
  apiKey: "sk_...",
  namespace: "my-app",
  entity: "user-123",
});

// Smart store — automatically extracts facts, deduplicates, resolves conflicts
const result = await mem.store({
  content: "I prefer TypeScript over JavaScript. My team uses React and Next.js.",
});

console.log(result.memories);
// [
//   { content: "Prefers TypeScript over JavaScript", category: "preference", ... },
//   { content: "Team uses React and Next.js", category: "professional", ... }
// ]
console.log(result.skipped);   // 0 — no duplicates
console.log(result.conflicts); // 0 — no conflicts

// Recall memories by meaning
const memories = await mem.recall({
  query: "What tech stack do they use?",
  category: "professional",
});

console.log(memories[0].content);
// → "Team uses React and Next.js"
```

## Configuration

```typescript
const mem = new MemLib({
  apiKey: "sk_...",              // required — your project API key
  baseUrl: "https://...",        // optional, defaults to production API
  namespace: "my-app",           // optional, defaults to "default"
  entity: "user-123",           // optional, defaults to "default"
});
```

Both `namespace` and `entity` can be set in the constructor as defaults and overridden per-call.

## API

### `mem.store(options)` → `StoreResult`

Store a memory. By default, uses **smart store** — the API extracts atomic facts via LLM, deduplicates against existing memories, and resolves conflicts automatically.

```typescript
// Smart store (default) — LLM extracts facts, deduplicates, resolves conflicts
const result = await mem.store({
  content: "I switched from VS Code to Cursor. Love the AI features.",
  source: "conversation",
  tags: ["preference"],
});

// result.memories — array of stored/updated memories with event type
// result.skipped  — count of duplicate facts skipped
// result.conflicts — count of conflicts detected and resolved

// Raw store (no LLM inference) — stores content as-is
const raw = await mem.store({
  content: "Exact fact to store verbatim",
  infer: false,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | `string` | — | **Required.** Text content to store |
| `namespace` | `string` | constructor default | Namespace override |
| `entity` | `string` | constructor default | Entity override |
| `infer` | `boolean` | `true` | Smart store (LLM extraction) or raw store |
| `tags` | `string[]` | — | Tags for categorization |
| `metadata` | `Record<string, unknown>` | — | Arbitrary metadata |
| `source` | `string` | — | Origin identifier (e.g. `"conversation"`, `"api"`) |
| `ttl` | `number` | — | Time-to-live in seconds |

### `mem.recall(options)` → `RetrievedMemory[]`

Semantic search with hybrid scoring: `score = 0.6 × similarity + 0.2 × recency + 0.2 × importance`

```typescript
const memories = await mem.recall({
  query: "What editor do they use?",
  category: "preference",      // filter by category
  tags: ["dev"],               // filter by tags
  minImportance: 0.5,          // minimum importance threshold
  limit: 5,
});

// Each result: { id, content, category, tags, metadata, similarity, recency, importance, score }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `query` | `string` | — | **Required.** Semantic search query |
| `namespace` | `string` | constructor default | Namespace override |
| `entity` | `string` | constructor default | Entity override |
| `category` | `string` | — | Filter by category (e.g. `"preference"`, `"personal"`) |
| `limit` | `number` | `10` | Max results |
| `tags` | `string[]` | — | Filter by any matching tag |
| `minImportance` | `number` | — | Minimum importance (0.0–1.0) |

### `mem.list(options?)` → `Memory[]`

List stored memories.

```typescript
const all = await mem.list();
const filtered = await mem.list({ entity: "user-456", limit: 20 });
```

### `mem.batchStore(options)` → `BatchStoreResult`

Store multiple memories at once (raw, no inference).

```typescript
const result = await mem.batchStore({
  memories: [
    { content: "Fact one" },
    { content: "Fact two", tags: ["important"] },
  ],
});
// result.count, result.memories
```

### `mem.delete(memoryId)` → `DeleteResult`

Delete a memory by UUID.

```typescript
await mem.delete("550e8400-e29b-41d4-a716-446655440000");
```

### `mem.health()` → `HealthResult`

Check API connectivity.

```typescript
const { status } = await mem.health();
```

## Smart Store Pipeline

When `infer: true` (default), the API runs this pipeline:

```
Content → Extract Facts (1 LLM call) → Batch Embed → Per-fact similarity search
  ├─ similarity > 0.95 → SKIP (duplicate)
  ├─ 0.85 < sim ≤ 0.95 → Conflict Resolution (1 LLM call, batched)
  │   ├─ MERGE      → combine into richer memory
  │   ├─ REPLACE    → new supersedes old
  │   ├─ KEEP       → existing is adequate
  │   └─ CONTRADICT → archive old, insert new
  └─ similarity ≤ 0.85 → INSERT (new)
```

**Max 2 LLM calls per store** regardless of how many facts are extracted.

## Categories

The smart store automatically categorizes each extracted fact:

`preference` · `personal` · `professional` · `plan` · `health` · `relationship` · `opinion` · `fact` · `other`

Use these to filter recall results with the `category` option.

## Error Handling

```typescript
import { MemLib, MemLibError } from "memlib";

try {
  await mem.recall({ query: "test" });
} catch (error) {
  if (error instanceof MemLibError) {
    console.error(error.status);  // HTTP status code
    console.error(error.body);    // API error response
  }
}
```

## Types

All types are exported for use:

```typescript
import type {
  MemLibConfig,
  StoreOptions,
  RecallOptions,
  Memory,
  RetrievedMemory,
  StoreResult,
  BatchStoreResult,
} from "memlib";
```
