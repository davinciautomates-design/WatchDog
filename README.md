# Watch Dog

Community safety platform for the Greater Toronto Area.

Watch Dog aggregates official emergency alerts (police, fire, EMS, road closures) and verified community reports onto an interactive map. Users see what is happening within 20 km of their location in near real time.

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/watchdog.git
cd watchdog

# Install all workspace dependencies
npm install

# Start local Postgres + Redis
docker-compose up -d

# Copy environment files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Run database migrations
cd apps/api && npm run db:migrate && cd ../..

# Start web (port 3000) + API (port 3001)
npm run dev
```

Open http://localhost:3000

## Project Structure

```
watchdog/
├── apps/
│   ├── web/          Next.js 14 frontend
│   └── api/          Fastify API + background workers
├── packages/
│   ├── types/        Shared TypeScript types
│   └── utils/        Shared utility functions
├── docs/             Architecture, API, Database, ADR docs
├── .github/workflows CI/CD pipelines
└── docker-compose.yml Local development services
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Run ESLint across all packages |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run all unit and integration tests |
| `docker-compose up -d` | Start Postgres + Redis |
| `docker-compose down` | Stop services |
| `docker-compose down -v` | Stop services and wipe data |

## Database

```bash
# In apps/api/
npm run db:migrate      # Run pending migrations
npm run db:generate     # Regenerate Prisma client after schema changes
npm run db:studio       # Open Prisma Studio (visual DB browser)
npm run db:reset        # Wipe and re-seed (development only)
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Map | Mapbox GL JS |
| Backend | Fastify, Node.js, TypeScript |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| Job Queue | BullMQ |
| ORM | Prisma |
| Testing | Vitest, Playwright |
| CI/CD | GitHub Actions + Turborepo |
| Deployment | Railway (MVP) |

## Documentation

| Document | Contents |
|----------|----------|
| [Architecture](docs/Architecture.md) | System design, components, data flow |
| [API](docs/API.md) | Endpoint reference |
| [Database](docs/Database.md) | Schema, migrations, PostGIS usage |
| [Testing](docs/Testing.md) | Test strategy and how to run tests |
| [Deployment](docs/Deployment.md) | Railway setup, environments, secrets |
| [Contributing](docs/Contributing.md) | Branch strategy, PR workflow, code standards |
| [Roadmap](docs/Roadmap.md) | Phase milestones and future features |
| [ADRs](docs/adr/) | Architecture Decision Records |

## Contributing

See [Contributing Guide](docs/Contributing.md).

All PRs must:
1. Pass CI (lint, typecheck, tests, build)
2. Have at least 1 reviewer approval
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)

## License

MIT
