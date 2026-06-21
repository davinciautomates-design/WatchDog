# Architecture

**Audience:** Developers and architects  
**Update when:** System design changes, new services are added

## Overview

Watch Dog is a monorepo containing two applications backed by shared packages:

```
Browser (Next.js)
  ↕ REST / JSON
Fastify API
  ↕ SQL / geospatial          ↕ cache / queue
PostgreSQL + PostGIS         Redis
                               ↕
                           BullMQ Workers
                               ↕
                        External Data Sources
```

## Components

### apps/web — Next.js 14 (App Router)

**Role:** Server-rendered React application. Fetches events from the API, renders the map and sidebar.

**Why App Router?** Server Components reduce client-side JavaScript. Layouts and loading states are built-in. API routes let us proxy the Mapbox token server-side so it is never exposed in the browser bundle.

**Key directories:**
- `app/` — pages and layouts (file-based routing)
- `components/map/` — Mapbox GL JS wrapper, marker layers
- `components/sidebar/` — event list, filter panel, event detail
- `hooks/` — `useGeolocation`, `useEvents`, `useFilters`
- `lib/` — API client (wraps fetch), `cn` utility

### apps/api — Fastify

**Role:** Stateless REST API and background worker host.

**Why separate from Next.js API routes?** BullMQ workers need long-lived Node.js processes. Next.js API routes are serverless (short-lived). The API can also be scaled independently.

**Key directories:**
- `src/routes/` — Fastify route plugins
- `src/services/` — Business logic (EventService, ReportService)
- `src/workers/` — BullMQ job definitions; one file per data source
- `src/db/` — Prisma client, raw geospatial query helpers
- `src/lib/` — logger, Redis client, queue setup

### packages/types

Shared TypeScript types. No runtime code — types only. Imported by web, api, and future mobile apps. Ensures the API response shape and the frontend's expectations never diverge.

### packages/utils

Shared pure functions. No side effects. Currently:
- `scoring.ts` — confidence score calculation
- `geo.ts` — Haversine distance, GTA bounds check

## Data Flow — Fetching Events

```
User opens map
  → Browser requests location (Geolocation API)
  → TanStack Query calls GET /api/v1/events?lat=…&lng=…&radius_km=20
  → Fastify checks Redis cache (key: geohash + category filters, TTL 30s)
  → Cache miss → Prisma $queryRaw with ST_DWithin
  → Results stored in Redis
  → JSON returned → TanStack Query caches in memory
  → React renders markers on Mapbox layer
```

## Data Flow — Community Report

```
User submits report form
  → POST /api/v1/reports (rate limited: 3/hour per IP hash)
  → Zod validates body
  → IP SHA-256 hashed
  → Report written to Postgres (status: PENDING)
  → BullMQ job queued: duplicate detection
  → Worker: checks for reports within 200m + 30min of same category
  → If duplicate found: merge (set event_id, status: MERGED)
  → If unique: promote to ACTIVE, compute confidence score
```

## Data Flow — Background Data Polling

```
BullMQ repeating job fires (e.g., every 60s for Toronto Police Service)
  → fetchRaw() — HTTP GET to external API
  → parseEvents(raw) — transform to CanonicalEvent[]
  → For each event:
      - Lookup by source_id + source_type
      - If exists: update (confidence, description, expires_at)
      - If new: insert
  → Invalidate Redis cache keys for affected geohashes
  → Write DataSourceRun audit record
```

## Geospatial Design

PostGIS stores all locations as `geography(Point, 4326)` — longitude/latitude in WGS84 (standard GPS coordinates).

**Why geography instead of geometry?** Geography uses accurate spherical calculations. Geometry uses flat-earth math — fine for small areas but introduces error at city scale.

**Critical index:**
```sql
CREATE INDEX events_location_gist ON events USING GIST(location);
```
Without this, ST_DWithin performs a full table scan.

**Duplicate detection** also uses PostGIS:
```sql
SELECT id FROM reports
WHERE ST_DWithin(location::geography, ST_MakePoint($1, $2)::geography, 200)
  AND category = $3
  AND created_at > NOW() - INTERVAL '30 minutes'
  AND status = 'ACTIVE'
```

## Caching Strategy

```
GET /api/v1/events?lat=43.65&lng=-79.38&categories=POLICE,FIRE
  → Cache key: events:43.65:-79.38:POLICE,FIRE  (TTL: 30s)
```

Cache is invalidated when a worker upserts new events in that area. We use a geohash (precision 5 ≈ 4km² cells) to group nearby events into the same cache key — avoids a separate key for every coordinate combination.

## Scaling Path

| Stage | Users | Change |
|-------|-------|--------|
| MVP | < 10k | Single Railway container per service |
| Phase 2 | 10–100k | Postgres read replica, API horizontal scale (2–4) |
| Phase 3 | 100k+ | AWS ECS/Fargate, Aurora, CloudFront CDN |
