# Contributing

**Audience:** All contributors  
**Update when:** Process changes, new conventions are adopted

## Branch Strategy — GitHub Flow

`main` is always production-ready. All work happens on feature branches.

```
main
  └── feat/map-clustering
  └── feat/report-submission
  └── fix/expired-event-cleanup
  └── chore/dependency-updates
  └── docs/api-reference
```

**Rules:**
- Never commit directly to `main`
- Branch names: `{type}/{short-description}` (e.g. `feat/event-filter-panel`)
- Keep branches short-lived (days, not weeks)
- One feature per branch

## Commit Messages — Conventional Commits

Format: `type(scope): description`

```
feat(map): add cluster layer for high-density areas
fix(worker): retry on 429 from Ontario 511 API
docs(api): update /events endpoint response schema
test(scoring): add unit tests for confidence decay
chore(deps): upgrade Prisma to 5.15.0
refactor(db): extract geospatial query helpers
perf(events): cache result by geohash
ci(actions): add nightly E2E job
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance (deps, config, tooling)
- `docs` — documentation only
- `test` — adding or fixing tests
- `refactor` — internal restructure, no behaviour change
- `perf` — performance improvement
- `ci` — CI/CD pipeline changes

**Why Conventional Commits?**  
Enables automated changelog generation (`git-cliff`, `semantic-release`). Makes `git log` readable. Required for SemVer automation in Phase 2.

## Pull Request Workflow

1. **Create a branch:** `git checkout -b feat/your-feature`
2. **Make changes:** follow the Definition of Done
3. **Push:** `git push -u origin feat/your-feature`
4. **Open a PR** targeting `main`
5. **Fill in the PR template:** What, Why, How to Test, Screenshots
6. **Wait for CI** to pass (lint, typecheck, tests, build)
7. **Request a review** — minimum 1 approval
8. **Squash merge** — keeps `main` history clean

## PR Template

```markdown
## What
Brief description of the change.

## Why
The problem this solves or the requirement it implements.

## How to Test
Step-by-step instructions to verify the change manually.

## Screenshots (UI changes)
Before / After screenshots.

## Checklist
- [ ] Tests added / updated
- [ ] Docs updated if API or schema changed
- [ ] No secrets in code
- [ ] CI passing
```

## Definition of Done

A feature is **Done** when:

- [ ] Requirements documented and accepted
- [ ] DB / API / UI design reviewed
- [ ] Code passes lint + typecheck
- [ ] Unit tests written and passing (≥ 80% coverage on new code)
- [ ] Integration tests written and passing
- [ ] Migrations backward-compatible and reviewed
- [ ] API docs updated if endpoints changed
- [ ] PR reviewed and approved
- [ ] CI pipeline green
- [ ] Verified working in staging

## Code Style

- TypeScript strict mode — no `any` without a comment
- No comments on obvious code — only comment non-obvious WHY
- File names: kebab-case (`event-service.ts`)
- React component files: PascalCase (`EventDetail.tsx`)
- Exported functions: camelCase
- Constants: UPPER_SNAKE_CASE (enums and module-level constants)
- Run `npm run format` before committing

## Versioning — Semantic Versioning

`MAJOR.MINOR.PATCH`
- `MAJOR` — breaking API change
- `MINOR` — new feature, backwards-compatible
- `PATCH` — bug fix

Tag releases: `git tag v1.2.3`
