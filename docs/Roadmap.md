# Roadmap

**Audience:** Product managers, stakeholders, contributors  
**Update when:** Milestones are completed, priorities change

## MVP Definition

The MVP is complete when a user can:

1. Open the app on mobile or desktop
2. Grant location permission (or use GTA centre as default)
3. See active incidents within 20 km on an interactive map
4. Filter by at least 3 categories
5. Tap/click a marker to see event detail
6. Submit a community report with location
7. Upvote an existing community report

And the system:
- Polls Toronto Police Service + Ontario 511 every 60 seconds
- Expires events past their TTL automatically
- Has unit + integration tests passing in CI
- Is deployed to staging on Railway

## Phases

### Phase 0 — Foundation ✅
*Target: Week 2*

- [x] Turborepo monorepo
- [x] Docker Compose (Postgres + PostGIS, Redis)
- [x] GitHub Actions CI
- [x] Next.js 14 app skeleton
- [x] Fastify API skeleton + health endpoint
- [x] Shared types + utils packages
- [x] CLAUDE.md, README, all docs

### Phase 1 — Map + Official Data
*Target: Week 5*

- [ ] Mapbox GL JS integration
- [ ] Browser geolocation hook
- [ ] `GET /api/v1/events` endpoint with PostGIS
- [ ] First BullMQ worker: Toronto Police Service
- [ ] Second BullMQ worker: Ontario 511
- [ ] Event markers on map
- [ ] Filter panel (category toggles)
- [ ] Event detail sidebar panel
- [ ] Redis cache layer

### Phase 2 — Community Reports
*Target: Week 7*

- [ ] `POST /api/v1/reports` endpoint
- [ ] `POST /api/v1/reports/:id/upvote` endpoint
- [ ] Duplicate detection worker
- [ ] Confidence score calculation + storage
- [ ] Report submission form in UI
- [ ] Community report markers on map

### Phase 3 — Polish + Reliability
*Target: Week 9*

- [ ] Dark/light/system theme (next-themes)
- [ ] Mobile bottom sheet (replaces sidebar)
- [ ] Loading states and skeleton screens
- [ ] Error boundaries and offline states
- [ ] Accessibility pass (WCAG 2.1 AA)
- [ ] Playwright E2E tests for critical journeys
- [ ] Performance audit (Core Web Vitals)
- [ ] Staging deployment on Railway

### Phase 4 — Expand Data Sources
*Target: Week 13*

- [ ] Toronto EMS Active Incidents (RSS)
- [ ] Halton Regional Police (RSS)
- [ ] Durham Regional Police (RSS)
- [ ] York Regional Police (RSS)
- [ ] Peel Regional Police (RSS)
- [ ] City of Toronto road closures (GeoJSON)
- [ ] Environment Canada alerts (ATOM/CAP)
- [ ] Event expiry TTL tuning per source

### Phase 5 — Auth + User Accounts
*Target: Week 17*

- [ ] Auth.js (Google + GitHub OAuth)
- [ ] User profiles
- [ ] Saved filter preferences (server-side)
- [ ] Report history for authenticated users
- [ ] Moderator role and dashboard
- [ ] Rate limits relaxed for authenticated users

### Phase 6 — React Native Mobile App
*Target: Week 25*

- [ ] Expo project in `apps/mobile`
- [ ] Shared `@watchdog/types` and `@watchdog/utils`
- [ ] MapLibre GL (React Native)
- [ ] Push notifications via Expo Push Service
- [ ] App Store + Play Store submission

## Future Enhancements (Backlog)

- Heatmap visualisation of incident density
- Historical incident explorer
- Public API for third-party integrations
- Embedded widget for neighbourhood websites
- Email / SMS alerts for saved areas
- Multi-language support (French for Ontario)
- Expansion to Ottawa, Hamilton, London
- Canada-wide expansion
