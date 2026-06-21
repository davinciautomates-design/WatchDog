# Testing

**Audience:** All developers  
**Update when:** Testing approach changes, new test patterns are established

## Philosophy

Test behaviour, not implementation.

A good test:
- Breaks when user-visible behaviour changes
- Does NOT break when you refactor internals
- Is readable: read the test name, understand the scenario

## Test Pyramid

```
         ▲
        /E\     E2E — critical user journeys (Playwright)
       /───\
      / Int \   Integration — API routes + DB queries (Vitest + Supertest)
     /───────\
    /  Unit   \ Unit — pure functions: scoring, parsing, dedup (Vitest)
   /───────────\
```

## Tools

| Tool | Layer | Why |
|------|-------|-----|
| Vitest | Unit + Integration | Fast, ESM-native, Jest-compatible API |
| Playwright | E2E | Cross-browser, excellent async handling |
| @vitest/coverage-v8 | Coverage | V8-native, fast |

## Running Tests

```bash
# All packages (via Turborepo)
npm test

# Single package
cd packages/utils && npm test

# Watch mode
cd packages/utils && npm run test:watch

# With coverage
cd packages/utils && npx vitest run --coverage

# E2E (requires running app)
cd apps/web && npm run test:e2e
```

## Unit Tests

**Location:** Next to the file being tested — `scoring.ts` → `scoring.test.ts`

**What to test:**
- `packages/utils/src/scoring.ts` — confidence calculation, edge cases
- `packages/utils/src/geo.ts` — distance, bounds check
- `apps/api/src/workers/sources/*.ts` — `parseEvents()` for each data source
- `apps/api/src/services/*.ts` — business logic, duplicate detection

**What NOT to unit test:**
- Prisma ORM itself
- Mapbox GL internals
- Next.js framework behaviour

**Example:**
```typescript
it('adds upvote bonus for user reports', () => {
  const score = calculateConfidence({ sourceType: 'USER', upvoteCount: 3 })
  expect(score).toBe(30 + 15) // 3 * 5 = 15
})
```

## Integration Tests

**Location:** `apps/api/src/routes/{name}.test.ts`

Integration tests hit a real Postgres test database (`watchdog_test`) and a real Redis instance. Both are available via Docker Compose locally and as GitHub Actions services in CI.

**Pattern:**
```typescript
import { buildServer } from '../test-utils/server'

describe('GET /api/v1/events', () => {
  it('returns events within radius', async () => {
    // Seed test data using prisma.$executeRaw
    const app = await buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/events?lat=43.65&lng=-79.38',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(1)
  })
})
```

**Test database:** `DATABASE_URL=postgresql://watchdog:watchdog@localhost:5432/watchdog_test`

Prisma migrations are applied to the test database before each test suite run.

## E2E Tests

**Location:** `apps/web/e2e/`

**Scope — critical journeys only:**
1. Map loads with placeholder state when location is denied
2. Location permission → map pans to user location
3. Filter panel toggles categories → markers update
4. Clicking a marker → event detail panel opens
5. Submit report form → success state

Playwright runs against the staging environment nightly. Not run on every PR (too slow).

## Coverage Targets

| Package | Target |
|---------|--------|
| packages/utils | 90% |
| apps/api routes | 70% |
| apps/api workers/sources | 80% (parseEvents) |

Coverage is checked in CI but does not block merges — it is a signal, not a gate. We will add a hard gate when we reach steady-state.

## CI Behaviour

- Unit + integration tests run on every PR (fast: ~60s target)
- E2E tests run nightly against staging
- Coverage report uploaded as a CI artifact
