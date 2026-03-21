# @memlib/bench

Benchmark CLI for testing the MemLib memory system — quality, deduplication, conflict resolution, recall precision, and performance.

## Usage

```bash
# From the monorepo root:
cd packages/bench

# Run all benchmarks
npx tsx src/cli.ts

# Run specific category
npx tsx src/cli.ts --tags conflict

# Run multiple categories
npx tsx src/cli.ts --tags quality,recall

# List available scenarios
npx tsx src/cli.ts --list
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Postgres connection string |
| `GOOGLE_API_KEY` | ✅* | — | Used for both embedding + LLM if specific keys not set |
| `EMBEDDING_PROVIDER` | | `gemini` | `gemini` or `openai` |
| `EMBEDDING_API_KEY` | | `GOOGLE_API_KEY` | Embedding provider API key |
| `LLM_PROVIDER` | | `gemini` | `gemini`, `openai`, or `anthropic` |
| `LLM_API_KEY` | | `GOOGLE_API_KEY` | LLM provider API key |
| `LLM_MODEL` | | — | Model override |

## Scenarios

### Quality (2)
- **Single fact extraction** — simple statement → 1 fact
- **Multi-fact extraction** — compound sentence → ≥2 facts

### Dedup (2)
- **Exact duplicate skip** — same content stored twice
- **Semantic duplicate skip** — "NYC" vs "New York City"

### Conflict (3)
- **Contradiction detection** — "love X" then "don't love X"
- **Preference update** — editor switch (VS Code → Cursor)
- **Location change** — city relocation

### Recall (2)
- **Precision** — top result matches the query topic
- **Category filter** — narrows results correctly

### Performance (3)
- **Smart store latency** — < 8s with LLM inference
- **Recall latency** — < 2s
- **Raw store latency** — < 2s without inference

## Output

```
  ⚡ memlib benchmark  ─────────────────────────────────────

  ✓ Single fact extraction  [quality]  1823ms  1 llm
    Extracted 1 fact(s)

  ✓ Contradiction detection  [conflict]  3241ms  2 llm
    Detected 1 contradiction(s)

  ✗ Semantic duplicate skip  [dedup]  1456ms  1 llm
    Missed semantic duplicate — inserted 1 new

  ─────────────────────────────────────────────────

  Scores
    quality   ████████████████████ 100% (2/2)
    dedup     ██████████░░░░░░░░░░  50% (1/2)
    conflict  ████████████████████ 100% (3/3)
    recall    ████████████████████ 100% (2/2)
    perf      ████████████████████ 100% (3/3)

  Total     11 passed  1 failed  of 12
  Duration  24.3s
  LLM calls 14 total

  FAIL  1 of 12 scenarios failed
```
