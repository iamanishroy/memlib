# memz

TypeScript SDK for the [MemZ](https://memz.anishroy.com) memory API.

## Install

```bash
npm install memz
```

## Quick Start

```ts
import { MemZ } from "memz";

const memz = new MemZ({
  apiKey: "sk_YOUR_KEY",
  // baseUrl: "http://your_memz_api.com", // optional
});

// Store a memory
await memz.store({
  namespace: "default",
  content: "Remember this fact",
});

// Semantic recall
const results = await memz.recall({
  namespace: "default",
  query: "what facts do I know?",
});

// List memories
const memories = await memz.list({ namespace: "default" });

// Delete a memory
await memz.delete("MEMORY_UUID_HERE");
```

## API

### `new MemZ(config)`

| Option    | Type     | Required | Default                         |
| --------- | -------- | -------- | ------------------------------- |
| `apiKey`  | `string` | ✅       |                                 |
| `baseUrl` | `string` | ❌       | `https://memz-api.anishroy.com` |

### Methods

| Method                | Description                   |
| --------------------- | ----------------------------- |
| `health()`            | Health check                  |
| `store(options)`      | Store a single memory         |
| `batchStore(options)` | Batch store multiple memories |
| `list(options)`       | List memories in a namespace  |
| `delete(memoryId)`    | Delete a memory by UUID       |
| `recall(options)`     | Semantic search over memories |

### Error Handling

```ts
import { MemZ, MemZError } from "memz";

try {
  await memz.store({ namespace: "default", content: "hello" });
} catch (err) {
  if (err instanceof MemZError) {
    console.log(err.status); // HTTP status code
    console.log(err.body); // parsed response body
  }
}
```

## License

MIT
