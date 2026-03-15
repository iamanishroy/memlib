# @memz/sdk

TypeScript SDK for the MemZ memory API.

## Installation

```bash
npm install @memz/sdk
```

## Quick Start

```typescript
import { MemZ } from "@memz/sdk";

const memz = new MemZ({
  apiKey: "sk_...",
  namespace: "chat",     // default namespace for all calls
});

// Store a memory (entity scopes it to a user/session)
await memz.store({
  entity: "user-123",
  content: "User prefers dark mode and uses TypeScript",
});

// Recall memories by meaning
const results = await memz.recall({
  entity: "user-123",
  query: "What programming language does the user like?",
});

console.log(results[0].content);
// → "User prefers dark mode and uses TypeScript"
```

## Configuration

```typescript
const memz = new MemZ({
  apiKey: "sk_...",           // required
  baseUrl: "https://...",     // optional, defaults to production API
  namespace: "chat",          // optional, defaults to "default"
  entity: "user-123",         // optional, defaults to "default"
});
```

Both `namespace` and `entity` can be set in the constructor (as defaults) and overridden per-call.

## API

### `memz.store(options)`

Store a single memory.

```typescript
await memz.store({
  content: "Remember this fact",
  entity: "user-123",           // optional if set in constructor
  namespace: "notes",           // optional if set in constructor
  tags: ["preference"],
  metadata: { source: "chat" },
  ttl: 86400,                   // expires in 24h
});
```

### `memz.recall(options)`

Semantic search with hybrid scoring (similarity + recency + importance).

```typescript
const memories = await memz.recall({
  query: "What does the user prefer?",
  entity: "user-123",
  limit: 5,
  tags: ["preference"],
  minImportance: 0.3,
});

// Each result has: id, content, tags, metadata, similarity, recency, importance, score
```

### `memz.list(options?)`

List memories scoped to namespace + entity.

```typescript
// Uses constructor defaults for namespace & entity
const all = await memz.list();

// Override entity or namespace per-call
const filtered = await memz.list({ entity: "user-456", limit: 20 });
```

### `memz.batchStore(options)`

Store multiple memories at once.

```typescript
await memz.batchStore({
  entity: "user-123",
  memories: [
    { content: "Fact one" },
    { content: "Fact two", tags: ["important"] },
  ],
});
```

### `memz.delete(memoryId)`

Delete a memory by UUID.

```typescript
await memz.delete("550e8400-e29b-41d4-a716-446655440000");
```

### `memz.health()`

Check API connectivity.

```typescript
const { status } = await memz.health();
```
