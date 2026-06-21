# ADR-006: Railway for Initial Deployment

**Status:** Accepted  
**Date:** 2026-06-20

## Context

We need a hosting platform for the MVP. Requirements:
- Managed PostgreSQL with PostGIS extension
- Managed Redis
- Docker container deployment
- Reasonable cost at low traffic
- Minimal DevOps overhead (team is focused on features, not infrastructure)

## Decision

Use **Railway.app** for MVP deployment.

## Comparison

| Criterion | Railway | Fly.io | Vercel + separate API | AWS |
|-----------|---------|--------|----------------------|-----|
| Managed Postgres + PostGIS | Yes | Yes (via add-on) | No (need separate DB) | RDS (complex setup) |
| Managed Redis | Yes | Yes (via add-on) | No | ElastiCache (complex) |
| Docker deploy | Yes | Yes | No (serverless only) | Yes (ECS/EKS) |
| Setup time | Minutes | ~1 hour | ~2 hours | Days |
| Monthly cost (MVP) | $5–20 | $5–20 | $0–20 (but no persistent workers) | $50–200+ |
| DevOps knowledge needed | Minimal | Low | Low | High |

## Why not Vercel

Vercel is excellent for Next.js frontends but does not support persistent Node.js processes. BullMQ workers need a process that stays alive. We would need a separate service for the API anyway, negating the simplicity advantage.

## Why not AWS

AWS is the right answer at scale (Phase 3) but introduces VPCs, security groups, IAM roles, load balancers, and deployment pipelines that require DevOps expertise not yet needed. We estimate 2–3 weeks of setup vs 30 minutes on Railway.

## Migration Path

When Railway's pricing or reliability becomes a concern at scale, we migrate to:
- **AWS ECS Fargate** for containers
- **Amazon Aurora PostgreSQL** (PostGIS-compatible)
- **Amazon ElastiCache** for Redis

The Dockerfiles and CI pipeline are platform-agnostic — migration is a configuration change, not a code change.

## Consequences

- Railway is the single point of failure for MVP — acceptable at early stage
- Costs are variable (usage-based) — set Railway budget alerts
- PostGIS must be enabled via Railway's Postgres plugin settings before deploying
