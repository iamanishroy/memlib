# memlib

TypeScript SDK for the MemLib memory API — store, recall, synthesize, and diff AI agent memories with semantic search, smart deduplication, context-aware synthesis, and automatic fact extraction.

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

// Smart store — extracts facts, deduplicates, resolves conflicts
await mem.store({
  content:
    "I prefer TypeScript over JavaScript. My team uses React and Next.js.",
});

// Recall memories by meaning
const memories = await mem.recall({
  query: "What tech stack do they use?",
});
// → [{ content: "Team uses React and Next.js", score: 0.92, ... }]

// Synthesize context for a conversation (2 LLM calls)
const ctx = await mem.prepare({
  messages: [
    { role: "user", content: "Can you help me set up a new project?" },
  ],
});
// → { context: "The user prefers TypeScript and their team uses React with Next.js.", ... }

// Check what changed since the last session (zero LLM calls)
const diff = await mem.diff({
  since: "2024-03-20T10:00:00Z",
});
// → { created: [...], updated: [...], deleted: [...], changeCount: 3 }
```

## Configuration

```typescript
const mem = new MemLib({
  apiKey: "sk_...", // required — your project API key
  baseUrl: "https://...", // optional, defaults to production API
  namespace: "my-app", // optional, defaults to "default"
  entity: "user-123", // optional, defaults to "default"
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

| Option      | Type                      | Default             | Description                                        |
| ----------- | ------------------------- | ------------------- | -------------------------------------------------- |
| `content`   | `string`                  | —                   | **Required.** Text content to store                |
| `namespace` | `string`                  | constructor default | Namespace override                                 |
| `entity`    | `string`                  | constructor default | Entity override                                    |
| `infer`     | `boolean`                 | `true`              | Smart store (LLM extraction) or raw store          |
| `tags`      | `string[]`                | —                   | Tags for categorization                            |
| `metadata`  | `Record<string, unknown>` | —                   | Arbitrary metadata                                 |
| `source`    | `string`                  | —                   | Origin identifier (e.g. `"conversation"`, `"api"`) |
| `ttl`       | `number`                  | —                   | Time-to-live in seconds                            |

### `mem.recall(options)` → `RetrievedMemory[]`

Semantic search with hybrid scoring: `score = 0.6 × similarity + 0.2 × recency + 0.2 × importance`

```typescript
const memories = await mem.recall({
  query: "What editor do they use?",
  category: "preference", // filter by category
  tags: ["dev"], // filter by tags
  minImportance: 0.5, // minimum importance threshold
  limit: 5,
});

// Each result: { id, content, category, tags, metadata, similarity, recency, importance, score }
```

| Option          | Type       | Default             | Description                                            |
| --------------- | ---------- | ------------------- | ------------------------------------------------------ |
| `query`         | `string`   | —                   | **Required.** Semantic search query                    |
| `namespace`     | `string`   | constructor default | Namespace override                                     |
| `entity`        | `string`   | constructor default | Entity override                                        |
| `category`      | `string`   | —                   | Filter by category (e.g. `"preference"`, `"personal"`) |
| `limit`         | `number`   | `10`                | Max results                                            |
| `tags`          | `string[]` | —                   | Filter by any matching tag                             |
| `minImportance` | `number`   | —                   | Minimum importance (0.0–1.0)                           |

### `mem.prepare(options)` → `PrepareResult`

**Context-aware memory synthesis.** Instead of returning raw memories, this analyzes the conversation to understand _intent_, runs multi-query recall, filters out irrelevant memories, and synthesizes a concise briefing paragraph ready to inject into a system prompt. **2 LLM calls** (intent analysis + synthesis).

```typescript
const ctx = await mem.prepare({
  messages: [{ role: "user", content: "Can you help me plan dinner tonight?" }],
});

console.log(ctx.context);
// → "The user is severely allergic to peanuts and loves sushi and Japanese food. They live in Berlin."
console.log(ctx.memoriesUsed); // ["mem_1", "mem_2", "mem_3"]
console.log(ctx.candidatesConsidered); // 8
console.log(ctx.tokenCount); // ~42

// Use it in your agent's system prompt:
const systemPrompt = `You are a helpful assistant.\n\nAbout this user:\n${ctx.context}`;
```

| Option          | Type        | Default             | Description                                     |
| --------------- | ----------- | ------------------- | ----------------------------------------------- |
| `messages`      | `Message[]` | —                   | **Required.** Conversation messages for context |
| `namespace`     | `string`    | constructor default | Namespace override                              |
| `entity`        | `string`    | constructor default | Entity override                                 |
| `maxCandidates` | `number`    | `20`                | Max memories to consider                        |
| `maxTokens`     | `number`    | —                   | Guide the output token budget                   |
| `category`      | `string`    | —                   | Filter candidates by category                   |

### `mem.diff(options)` → `DiffResult`

**Memory changelog.** Returns what changed since a given timestamp — new memories created, existing memories updated (via conflict resolution), and deleted memories. **Zero LLM calls**, pure SQL query on the audit trail. Typically completes in <20ms.

```typescript
const diff = await mem.diff({
  since: "2024-03-20T10:00:00Z",
});

console.log(diff.created);
// → [{ id: "mem_1", content: "Started learning piano", createdAt: "2024-03-21T09:00:00Z" }]

console.log(diff.updated);
// → [{ id: "mem_2", content: "Lives in Tokyo", previousContent: "Lives in Berlin", updatedAt: "..." }]

console.log(diff.deleted);
// → []

console.log(diff.changeCount); // 2

// Use it to make your agent aware of changes:
if (diff.changeCount > 0) {
  const changes = diff.updated
    .map((u) => `Changed: "${u.previousContent}" → "${u.content}"`)
    .concat(diff.created.map((c) => `New: ${c.content}`))
    .join("\n");
  systemPrompt += `\n\nRecent changes since last session:\n${changes}`;
}
```

| Option      | Type     | Default             | Description                                                  |
| ----------- | -------- | ------------------- | ------------------------------------------------------------ |
| `since`     | `string` | —                   | **Required.** ISO timestamp — return changes after this time |
| `namespace` | `string` | constructor default | Namespace override                                           |
| `entity`    | `string` | constructor default | Entity override                                              |
| `limit`     | `number` | `100`               | Max events to return                                         |

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

## Synthesis Pipeline

When you call `mem.prepare()`, the API runs:

```
Messages → Analyze Intent (1 LLM call) → Multi-Query Recall → Filter & Synthesize (1 LLM call)
  ├─ Intent analysis generates 2-4 targeted search queries
  ├─ Parallel embedding + vector search across queries
  ├─ Deduplicate & rank candidates by score
  └─ Synthesis LLM filters irrelevant memories and produces a concise briefing
```

**Always 2 LLM calls.** Returns a ready-to-use context paragraph instead of raw memory dumps.

## Categories

The smart store automatically categorizes each extracted fact:

`preference` · `personal` · `professional` · `plan` · `health` · `relationship` · `opinion` · `fact` · `other`

Use these to filter recall or prepare results with the `category` option.

## Error Handling

```typescript
import { MemLib, MemLibError } from "memlib";

try {
  await mem.recall({ query: "test" });
} catch (error) {
  if (error instanceof MemLibError) {
    console.error(error.status); // HTTP status code
    console.error(error.body); // API error response
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
  PrepareOptions,
  DiffOptions,
  Memory,
  RetrievedMemory,
  StoreResult,
  PrepareResult,
  DiffResult,
  BatchStoreResult,
  Message,
} from "memlib";
```
