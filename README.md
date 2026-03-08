# memz

A memory API platform — store, recall, and manage AI memories with semantic search.

## Tech Stack

- **Next.js** — Web dashboard
- **Hono** — API server on Cloudflare Workers
- **oRPC** — Type-safe APIs with OpenAPI + REST endpoints
- **Drizzle ORM** — TypeScript-first database layer
- **PostgreSQL** — Database (via Prisma Data Proxy)
- **Better-Auth** — Authentication (Google, GitHub, email)
- **Turborepo** — Monorepo build system

## Project Structure

```
memz/
├── apps/
│   ├── web/           # Next.js dashboard
│   └── server/        # Cloudflare Worker API
├── packages/
│   ├── api/           # oRPC routes & middleware
│   ├── auth/          # Auth config (better-auth)
│   ├── db/            # Drizzle schema & connection
│   ├── memory/        # Memory service (store, recall, consolidate)
│   ├── sdk/           # Published SDK (@anishroy/memz)
│   ├── env/           # Shared env config
│   ├── ui/            # Shared UI components
│   └── infra/         # Alchemy infra-as-code
```

## Getting Started

```bash
npm install
```

### Environment Variables

Copy `apps/server/.env.example` → `apps/server/.env` and fill in:

```env
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:8002
CORS_ORIGIN=http://localhost:8001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Database Setup

```bash
npm run db:push
```

### Run Dev

```bash
npm run dev
```

- Web: [http://localhost:8001](http://localhost:8001)
- API: [http://localhost:8002](http://localhost:8002)

## API Endpoints

All API routes are under `/v1` and require an API key (`Authorization: Bearer sk_...`).

| Method   | Path                     | Permission   | Description          |
| -------- | ------------------------ | ------------ | -------------------- |
| `GET`    | `/v1/health`             | Read         | Health check         |
| `GET`    | `/v1/memory`             | Read         | List memories        |
| `POST`   | `/v1/memory`             | Read & Write | Store a memory       |
| `POST`   | `/v1/memory/batch`       | Read & Write | Batch store          |
| `POST`   | `/v1/memory/recall`      | Read         | Semantic search      |
| `DELETE` | `/v1/memory/{memoryId}`  | Admin        | Delete a memory      |
| `POST`   | `/v1/memory/migrate`     | Admin        | Run migrations       |
| `POST`   | `/v1/memory/consolidate` | Admin        | Consolidate memories |

### Quick Example

```bash
curl -X POST https://your-worker.workers.dev/v1/memory \
  -H "Authorization: Bearer sk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"namespace": "user:alice", "content": "Loves TypeScript"}'
```

## SDK

Install the published SDK:

```bash
npm install @anishroy/memz
```

## Deployment

### Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com)
2. **Cloudflare API Token** — create at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) using the "Edit Cloudflare Workers" template

### Manual Deploy

```bash
# 1. Login to Cloudflare (first time only)
npx wrangler login

# 2. Configure Alchemy (first time only)
cd packages/infra && npx alchemy configure

# 3. Deploy
cd packages/infra && npm run deploy
```

### CI/CD (GitHub Actions)

Pushes to `main` auto-deploy via `.github/workflows/deploy.yml`.

**Setup:** Add `CLOUDFLARE_API_TOKEN` as a [GitHub repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

1. Go to your repo → Settings → Secrets → Actions
2. Add `CLOUDFLARE_API_TOKEN` with your Cloudflare API token

Every push to `main` will:

- Install dependencies
- Run type checks
- Deploy the Worker via `wrangler deploy`

### Teardown

```bash
cd packages/infra && npm run destroy
```

## Available Scripts

| Script                | Description                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start all apps in dev mode           |
| `npm run build`       | Build all apps                       |
| `npm run check-types` | TypeScript check across all packages |
| `npm run db:push`     | Push schema changes to database      |
| `npm run db:studio`   | Open Drizzle Studio                  |
