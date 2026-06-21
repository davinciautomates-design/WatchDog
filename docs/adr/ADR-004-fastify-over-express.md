# ADR-004: Fastify over Express

**Status:** Accepted  
**Date:** 2026-06-20

## Context

The Watch Dog API needs a Node.js HTTP framework. Express is the most popular choice, but newer alternatives offer better performance and TypeScript integration.

## Decision

Use **Fastify 4**.

## Comparison

| Criterion | Fastify | Express | Hono |
|-----------|---------|---------|------|
| Performance | ~70k req/s | ~25k req/s | ~100k req/s |
| TypeScript | First-class | via `@types/express` | First-class |
| Schema validation | Built-in (Ajv) | Manual / middleware | Built-in (Zod) |
| Plugin system | Structured | Middleware stack | Middleware stack |
| Ecosystem | Large | Largest | Small but growing |
| Production use | Platformatic, NestJS | Everywhere | Edge/Workers |

Fastify is 2–3× faster than Express in benchmarks. Its built-in schema validation (Ajv) prevents common bugs at the route level. TypeScript support is native, not bolted on.

## Why not Hono

Hono is faster but has a smaller ecosystem and less community knowledge. Fastify is battle-tested at scale (used by Platformatic, Mercurius, and thousands of production APIs). Easier to find answers and examples.

## Why not Next.js API Routes

Next.js API routes are serverless — they cannot host long-lived BullMQ workers. We need a persistent Node.js process for the background data polling jobs. A separate Fastify server gives us this and allows the API to scale independently from the frontend.

## Consequences

- CORS configured via `@fastify/cors` plugin
- All routes are Fastify plugins (async functions that take a `FastifyInstance`)
- Request/response validation uses Zod (we prefer Zod's TypeScript integration over Fastify's native Ajv for type inference)
