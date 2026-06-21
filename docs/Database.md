# Database

**Audience:** Backend developers, DBAs  
**Update when:** Schema changes (new model, new field, new index)

## Technology

**PostgreSQL 16 + PostGIS 3.4**

- PostgreSQL: world's most advanced open-source relational database
- PostGIS: extension that adds geographic types and spatial functions

## Connection

```
DATABASE_URL=postgresql://watchdog:watchdog@localhost:5432/watchdog
```

Development uses Docker (`postgis/postgis:16-3.4` image). Production uses Railway's managed Postgres.

## ORM

**Prisma 5** — type-safe ORM that generates a TypeScript client from the schema.

```bash
# After changing schema.prisma:
npm run db:generate   # Regenerate TypeScript client

# To create a new migration:
npm run db:migrate    # Detects schema diff, creates SQL migration file
```

## Schema Overview

See `apps/api/prisma/schema.prisma` for the authoritative source.

### Event

Stores all safety incidents from all sources.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `source_id` | String? | External identifier (e.g. TPS incident number) |
| `source_type` | Enum | OFFICIAL_API, GOV_DATA, MUNICIPAL, RSS, USER |
| `category` | Enum | POLICE, FIRE, AMBULANCE, ROAD, CRIME, DISTURBANCE, SAFETY, COMMUNITY |
| `title` | String | Short title |
| `description` | Text | Full description |
| `location` | geography(Point) | PostGIS — not in Prisma schema, added via raw migration |
| `address` | String? | Human-readable address |
| `confidence` | Int | 0–100 confidence score |
| `status` | Enum | ACTIVE, EXPIRING, EXPIRED, ARCHIVED |
| `started_at` | DateTime | When the event began |
| `expires_at` | DateTime? | Expected end time |
| `raw_payload` | JSON | Original source data — never discard |
| `metadata` | JSON | Source-specific fields without schema migration |
| `created_at` | DateTime | Record creation time |
| `updated_at` | DateTime | Auto-updated by Prisma |

**Unique constraint:** `(source_id, source_type)` — prevents duplicate imports from the same source.

### Report

Community-submitted incidents. Awaiting verification before promoting to Event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `event_id` | UUID? FK | Set when merged into a verified Event |
| `category` | Enum | Same as Event |
| `description` | Text | |
| `photo_url` | String? | Uploaded photo |
| `location` | geography(Point) | PostGIS |
| `ip_hash` | String | SHA-256 of submitter IP — not raw IP |
| `confidence` | Int | Starts at 30, grows with upvotes/verifications |
| `upvote_count` | Int | Cached count |
| `verify_count` | Int | Cached count |
| `status` | Enum | PENDING, ACTIVE, MERGED, REJECTED |
| `created_at` | DateTime | |

### Upvote

One-per-IP enforcement on upvotes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | |
| `report_id` | UUID FK | |
| `ip_hash` | String | SHA-256 of voter IP |
| `created_at` | DateTime | |

**Unique constraint:** `(report_id, ip_hash)` — prevents double-upvote.

### DataSourceRun

Audit log for background data poller jobs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | |
| `source_name` | String | e.g. `toronto-police-service` |
| `fetched_at` | DateTime | When the HTTP request was made |
| `event_count` | Int | Number of events processed |
| `error` | String? | Error message if the job failed |
| `duration_ms` | Int | Job wall-clock time |

## PostGIS

PostGIS geography columns cannot be expressed in Prisma's schema syntax. They are added via raw SQL in migrations:

```sql
-- In a Prisma migration SQL file:
ALTER TABLE events ADD COLUMN location geography(Point, 4326);
ALTER TABLE reports ADD COLUMN location geography(Point, 4326);

CREATE INDEX events_location_gist ON events USING GIST(location);
CREATE INDEX reports_location_gist ON reports USING GIST(location);
```

All geospatial queries use `prisma.$queryRaw`:

```typescript
// Find events within 20 km of a point
const events = await prisma.$queryRaw<RawEvent[]>`
  SELECT
    id, category, title, description,
    ST_AsGeoJSON(location)::json AS location,
    confidence, status, started_at, expires_at
  FROM events
  WHERE ST_DWithin(
    location::geography,
    ST_MakePoint(${lng}, ${lat})::geography,
    ${radiusKm * 1000}
  )
  AND status = 'ACTIVE'
  ORDER BY confidence DESC, started_at DESC
  LIMIT ${limit} OFFSET ${(page - 1) * limit}
`
```

**Why `::geography` cast?** Ensures spherical distance calculation (accurate). Without it, ST_DWithin uses flat-earth geometry.

## Indexes

```sql
-- Geospatial (required for radius queries)
CREATE INDEX events_location_gist ON events USING GIST(location);
CREATE INDEX reports_location_gist ON reports USING GIST(location);

-- Event lifecycle worker
CREATE INDEX events_status_expires ON events(status, expires_at);

-- Report duplicate detection
CREATE INDEX reports_created_category ON reports(created_at, category);

-- Source deduplication (Prisma @@unique creates this automatically)
CREATE UNIQUE INDEX events_source_id_source_type ON events(source_id, source_type);
```

## Migration Workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration (Prisma auto-generates SQL diff)
npm run db:migrate

# 3. Review the generated SQL in prisma/migrations/
# 4. Commit both schema.prisma and the migration folder

# Production deployment runs:
npm run db:migrate:deploy   # applies pending migrations without prompting
```

## Backup

Production: Railway automated backups (daily, 7-day retention). Before any destructive migration, create a manual backup via Railway dashboard.
