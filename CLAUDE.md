# Watch Dog — CLAUDE.md

This file tells Claude Code about the project. Keep it updated as patterns evolve.

## What this project is

Watch Dog is a community safety web platform for the Greater Toronto Area. It aggregates official emergency feeds (police, fire, EMS, road closures) and crowd-sourced community reports onto an interactive map. Users see what is happening within 20 km of their location.

## Repository layout

```
watchdog/
├── apps/web/      Next.js 14 frontend (App Router, TypeScript, Tailwind, shadcn/ui)
├── apps/api/      Fastify API + BullMQ background workers
├── packages/types/  Shared TypeScript types — imported by web, api, and future mobile
├── packages/utils/  Shared pure functions (confidence scoring, geo math)
├── docs/          Architecture docs and ADRs
└── docker-compose.yml  Local Postgres + Redis
```

This is a **Turborepo monorepo** with npm workspaces. Always run commands from the repo root using `npx turbo <task>` or `npm run <task>`.

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 + App Router | SSR, SEO, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Utility-first; accessible components |
| State | TanStack Query (server) + Zustand (UI) | Separate server/client state concerns |
| Map | Mapbox GL JS | WebGL performance; custom dark/light theme |
| Backend | Fastify (Node.js) | Faster than Express; TypeScript-first |
| ORM | Prisma | Type-safe DB access; migrations |
| Database | PostgreSQL 16 + PostGIS | Geospatial queries (ST_DWithin) |
| Cache/Queue | Redis + BullMQ | Caching + background data poller jobs |
| Testing | Vitest (unit/integration), Playwright (E2E) | Fast, ESM-native |
| CI | GitHub Actions + Turborepo cache | Parallel jobs, cached builds |

## Coding conventions

- **TypeScript strict mode** everywhere — no `any` without a comment explaining why
- **No comments on obvious code**; add a comment only when the WHY is non-obvious
- **No default exports from shared packages** — use named exports for tree-shaking
- **Conventional Commits**: `feat(scope):`, `fix(scope):`, `chore(scope):`, etc.
- **File naming**: kebab-case for files, PascalCase for React components
- **Zod for validation** at API boundaries — never trust untyped external data

## Patterns to follow

### Adding a new API route

1. Create `apps/api/src/routes/{name}.ts` exporting an async Fastify plugin
2. Register it in `apps/api/src/index.ts`
3. Add request/response Zod schemas in the same file
4. Write integration tests in `apps/api/src/routes/{name}.test.ts`
5. Update `docs/API.md`

### Adding a new data source

1. Create `apps/api/src/workers/sources/{sourceName}.ts`
2. Export `fetchRaw(): Promise<unknown>` and `parseEvents(raw): CanonicalEvent[]`
3. Register the BullMQ repeating job in `apps/api/src/workers/index.ts`
4. Write unit tests for `parseEvents` — mock the HTTP call, not the DB

### Adding a new event category

1. Add to `Category` type in `packages/types/src/index.ts`
2. Add metadata entry in `CATEGORY_META`
3. Add TTL in `EVENT_TTL_HOURS`
4. Add the Prisma enum value (new migration)
5. Add marker colour/icon in the web map layer config

### PostGIS queries

Prisma cannot express PostGIS geography types natively. All geospatial queries use `prisma.$queryRaw`. Helper functions live in `apps/api/src/db/geo.ts`. Always use parameterised queries — never string-concatenate coordinates.

```typescript
// Correct — parameterised
const events = await prisma.$queryRaw`
  SELECT id, title, ST_AsGeoJSON(location)::json AS location
  FROM events
  WHERE ST_DWithin(location::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMetres})
  AND status = 'ACTIVE'
`
```

## Local development setup

```bash
# 1. Start Postgres + Redis
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Copy environment files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 4. Run Prisma migrations
cd apps/api && npm run db:migrate

# 5. Start everything
npm run dev     # runs web (port 3000) and api (port 3001) concurrently
```

## Running tests

```bash
npm test                      # all packages via Turborepo
cd packages/utils && npm test # single package
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | api/.env | PostgreSQL connection string |
| `REDIS_URL` | api/.env | Redis connection string |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | web/.env.local | Mapbox — must be NEXT_PUBLIC_ because MapCanvas runs client-side |
| `NEXT_PUBLIC_API_URL` | web/.env.local | API base URL exposed to browser |
| `CORS_ORIGINS` | api/.env | Comma-separated allowed origins |

## Key architectural decisions

See `docs/adr/` for full context. Short version:

- **No auth in MVP** — community reports are anonymous, rate-limited by IP hash
- **Monorepo** — shared types and utils between web, api, and future mobile
- **Mapbox over Leaflet** — WebGL performance at scale; custom theming
- **Postgres + PostGIS over MongoDB** — relational integrity + native geospatial
- **Fastify over Express** — 2–3× faster, built-in validation
- **Railway for deployment** — managed PostGIS + Redis, zero DevOps overhead for MVP

## What NOT to do

- Never store raw IP addresses — hash with SHA-256 first
- Never put secrets in code or `.env.example` values
- Never commit directly to `main` — always use a PR
- Never skip tests to ship faster — the Definition of Done requires them
- Never add `@ts-ignore` without a comment explaining the reason and a TODO
