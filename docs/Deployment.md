# Deployment

**Audience:** DevOps, on-call engineers, anyone deploying the app  
**Update when:** Infrastructure changes, new services are added, secrets change

## Environments

| Environment | URL | Trigger |
|-------------|-----|---------|
| local | http://localhost:3000 | `npm run dev` |
| staging | https://staging.watchdog.app | Auto on merge to `main` |
| production | https://watchdog.app | Manual promotion from staging |

## Platform — Railway

Railway is a Platform-as-a-Service that deploys Docker containers. It manages:
- Postgres (with PostGIS extension)
- Redis
- Container orchestration
- TLS certificates
- Environment variable management

### Services in Railway

```
watchdog (project)
  ├── web     (Next.js, Docker)
  ├── api     (Fastify + BullMQ, Docker)
  ├── postgres (managed, PostGIS enabled)
  └── redis    (managed)
```

### First-time Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy (Railway reads the Dockerfile)
railway up
```

### Environment Variables

Set in Railway dashboard → Project → Variables.  
Never put secrets in code or `.env.example` value fields.

**Required for api service:**
```
DATABASE_URL       (Railway auto-injects from Postgres plugin)
REDIS_URL          (Railway auto-injects from Redis plugin)
NODE_ENV           production
PORT               3001
LOG_LEVEL          info
CORS_ORIGINS       https://watchdog.app
```

**Required for web service:**
```
MAPBOX_ACCESS_TOKEN   (from Mapbox dashboard)
NEXT_PUBLIC_API_URL   https://api.watchdog.app
NODE_ENV              production
```

## Dockerfiles

Each app has its own Dockerfile in its directory.

**Pattern (multi-stage build):**
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/*/package*.json ./packages/*/
RUN npm ci --workspace=@watchdog/api --workspace=@watchdog/types --workspace=@watchdog/utils

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo build --filter=@watchdog/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

Dockerfiles will be added in the deployment phase (after Phase 3).

## Migrations

Migrations run automatically before each deployment:

```bash
# In the api container's start command:
npx prisma migrate deploy && node dist/index.js
```

`prisma migrate deploy` applies pending migrations without interactive prompts. It is safe to run on every startup — it is a no-op if migrations are already applied.

## Rollback

Railway supports instant rollback to the previous deployment from the dashboard.

For database rollbacks: Prisma does not generate down migrations. If a migration must be reversed:
1. Write a new migration that reverses the change
2. Deploy that migration
3. Restore from backup if data was lost (Railway daily backups)

## Monitoring

- **Logs:** Railway dashboard → Logs tab (or `railway logs`)
- **Uptime:** Add uptime monitor (Better Uptime / UptimeRobot) pointing to `/api/v1/health`
- **Errors:** Add Sentry (Phase 2) — catch unhandled exceptions with stack traces
- **Performance:** Add Datadog or Grafana (Phase 3)
