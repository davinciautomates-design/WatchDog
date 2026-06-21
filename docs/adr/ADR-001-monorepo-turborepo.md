# ADR-001: Monorepo with Turborepo

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Watch Dog needs to share TypeScript types between the web app, the API, and a future React Native mobile app. Without a monorepo, types must be published to npm or duplicated, both of which create drift and maintenance overhead.

We also want a single CI pipeline that validates everything together, and a single `npm install` that works for the whole project.

## Decision

Use a **Turborepo monorepo** with npm workspaces.

- `apps/web`, `apps/api` — applications
- `packages/types`, `packages/utils` — shared code
- Turborepo orchestrates tasks (build, test, lint) with caching

## Why Turborepo over alternatives

| Option | Verdict |
|--------|---------|
| Turborepo | Lightweight, fast, Vercel-maintained, easy to add |
| Nx | More powerful but heavier: plugins, generators, steeper learning curve |
| Separate repos | More isolation but types must be published to npm to share |
| Yarn workspaces | npm workspaces now equivalent; no reason to switch |

## Consequences

- All developers clone one repo and run `npm install` once
- Turborepo caches build outputs — CI is fast even as the codebase grows
- Adding a React Native `apps/mobile` package is a single directory addition
- New contributors must understand workspace package resolution (`@watchdog/types: "*"`)
