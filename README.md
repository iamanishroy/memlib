# memlib

A memory API for AI agents — store, recall, and manage memories with semantic search.

## Tech Stack

- **Next.js** — Dashboard, API routes, docs
- **oRPC** — Type-safe API (REST + RPC)
- **Drizzle ORM** — Database layer
- **PostgreSQL** — Database (Neon)
- **Better-Auth** — Authentication
- **MCP SDK** — Model Context Protocol server
- **Turborepo** — Monorepo

## Project Structure

```
memlib/
├── apps/
│   └── web/             # Next.js app (dashboard, API, docs)
├── packages/
│   ├── ai/              # AI provider abstraction (embedding + LLM)
│   ├── api/             # oRPC routers & auth middleware
│   ├── bench/           # Benchmarking CLI
│   ├── config/          # Shared TypeScript config
│   ├── db/              # Drizzle schema (auth, projects, API keys)
│   ├── e2e/             # End-to-end tests
│   ├── memory/          # Core memory service
│   └── sdk/             # Published SDK (memlib on npm)
```

## Getting Started

```bash
npm install
```

Create `apps/web/.env`:

```env
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:8001
DATABASE_URL=postgres://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

```bash
npm run db:push
npm run dev
```

App runs at [http://localhost:8001](http://localhost:8001).

## API

REST routes at `/api/v1/*` — requires `Authorization: Bearer sk_...`.

| Method   | Path                         | Description                    |
| -------- | ---------------------------- | ------------------------------ |
| `POST`   | `/api/v1/memory`             | Store a memory                 |
| `POST`   | `/api/v1/memory/batch`       | Batch store                    |
| `POST`   | `/api/v1/memory/recall`      | Semantic search                |
| `POST`   | `/api/v1/memory/prepare`     | Context-aware memory synthesis |
| `POST`   | `/api/v1/memory/diff`        | Changelog since timestamp      |
| `GET`    | `/api/v1/memory`             | List memories                  |
| `GET`    | `/api/v1/memory/events`      | Audit trail                    |
| `DELETE` | `/api/v1/memory/{memoryId}`  | Delete a memory                |
| `POST`   | `/api/v1/memory/consolidate` | Consolidate memories           |
| `POST`   | `/api/v1/memory/migrate`     | Run migrations                 |
| `POST`   | `/api/mcp`                   | MCP server (Streamable HTTP)   |

## SDK

```bash
npm install memlib
```
