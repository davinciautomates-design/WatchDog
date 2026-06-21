# ADR-003: PostgreSQL + PostGIS over MongoDB

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Watch Dog stores events with geographic coordinates and must efficiently answer "find all events within 20 km of this point". This is a geospatial query that most databases handle poorly without extensions.

Our data has clear relational structure: Events → Reports → Upvotes.

## Decision

Use **PostgreSQL 16 + PostGIS 3.4**.

## Why PostgreSQL over MongoDB

| Concern | PostgreSQL + PostGIS | MongoDB Atlas |
|---------|---------------------|---------------|
| Geospatial | Native `geography` type, GIST index, ST_DWithin | 2dsphere index, `$geoNear` |
| Performance | GIST index + geography = accurate spherical queries | Less mature, slower on complex spatial joins |
| Data integrity | FK constraints, UNIQUE, ACID transactions | Optional schema enforcement |
| Relational queries | Natural (JOINs) | Awkward ($lookup) |
| Tooling | Prisma + pgAdmin + `psql` | Mongoose, Compass |
| Managed hosting | Railway, Render, Supabase, AWS RDS | MongoDB Atlas |

## Why not SQLite

SQLite does not support PostGIS or horizontal read replicas. Not suitable for geospatial production workloads.

## Why PostGIS `geography` over `geometry`

- `geography` uses spherical math — accurate for distances at city scale
- `geometry` uses flat-earth math — fast but introduces error proportional to area size
- For a 20 km radius around Toronto, flat-earth error is negligible — but `geography` is safer and not meaningfully slower with a GIST index

## Consequences

- PostGIS `geography(Point, 4326)` columns cannot be declared in Prisma schema — they are added via raw SQL in migrations
- All radius queries use `prisma.$queryRaw` with parameterised `ST_DWithin`
- The Docker image `postgis/postgis:16-3.4` is used for local development
- Railway's managed Postgres supports the PostGIS extension
