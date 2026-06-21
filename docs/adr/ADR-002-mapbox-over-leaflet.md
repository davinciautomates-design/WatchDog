# ADR-002: Mapbox GL JS over Leaflet

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Watch Dog needs an interactive map capable of rendering hundreds to thousands of incident markers without degrading performance. The map must support custom styling to match both dark and light themes.

## Decision

Use **Mapbox GL JS** for map rendering.

## Why Mapbox

| Criterion | Mapbox GL JS | Leaflet | Google Maps |
|-----------|-------------|---------|-------------|
| Rendering | WebGL (GPU) | DOM/Canvas | DOM |
| Markers at scale | 10k+ at 60fps | ~1k before lag | Limited |
| Custom theming | Full (JSON style spec) | Limited | Limited |
| Dark mode | Native style swap | CSS hacks | Limited |
| Free tier | 50k loads/month | Free (open source) | $200 credit/month |
| License | Open source client | BSD | Proprietary |

Mapbox's WebGL rendering is essential for performance at scale. A GTA-wide map can have hundreds of concurrent incidents.

## Cost Concern

At 100k users, Mapbox costs ~$500/month. **Mitigation:** MapLibre GL JS is a fully open-source Mapbox fork that accepts the same style spec and API. We can switch to MapLibre + self-hosted PMTiles (vector tiles) with no React component changes. The migration path is planned but not needed for MVP.

## Consequences

- Mapbox token must be stored server-side (proxied via Next.js API route) to prevent client-side exposure
- The token is URL-restricted in the Mapbox dashboard to our domain
- If Mapbox pricing becomes untenable, migrate to MapLibre + Cloudflare R2-hosted PMTiles
