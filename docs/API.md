# API Reference

**Audience:** Frontend developers, mobile developers, third-party integrators  
**Update when:** Any endpoint is added, changed, or removed  
**Base URL:** `http://localhost:3001` (development) / `https://api.watchdog.app` (production)

## Conventions

- All endpoints are prefixed with `/api/v1/`
- All responses use the envelope: `{ data, meta, errors }`
- All timestamps are ISO 8601 UTC strings
- Errors return `4xx` / `5xx` with descriptive `errors[]`
- `X-Request-Id` header is present on every response for tracing

## Response Envelope

```json
{
  "data": <object or array>,
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 50,
    "generatedAt": "2026-06-20T12:00:00Z"
  },
  "errors": []
}
```

---

## Endpoints

### GET /api/v1/health

Health check. Used by deployment platforms and uptime monitors.

**Response 200**
```json
{
  "status": "ok",
  "timestamp": "2026-06-20T12:00:00Z",
  "version": "0.1.0"
}
```

---

### GET /api/v1/events

List active events within a radius.

**Query parameters**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `lat` | number | Yes | — | Latitude (-90 to 90) |
| `lng` | number | Yes | — | Longitude (-180 to 180) |
| `radius_km` | number | No | 20 | Max 20 |
| `categories` | string | No | all | Comma-separated: `POLICE,FIRE` |
| `page` | number | No | 1 | |
| `limit` | number | No | 50 | Max 100 |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "sourceType": "OFFICIAL_API",
      "category": "POLICE",
      "title": "Police Activity",
      "description": "Officers on scene at ...",
      "location": { "lat": 43.65, "lng": -79.38 },
      "address": "123 King St W, Toronto",
      "confidence": 90,
      "status": "ACTIVE",
      "startedAt": "2026-06-20T11:00:00Z",
      "expiresAt": "2026-06-20T15:00:00Z",
      "metadata": {},
      "createdAt": "2026-06-20T11:01:00Z",
      "updatedAt": "2026-06-20T11:01:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 50, "generatedAt": "…" },
  "errors": []
}
```

---

### GET /api/v1/events/:id

Single event detail.

**Response 200** — same Event shape as above, no pagination in meta.  
**Response 404** — `{ errors: [{ code: "NOT_FOUND", message: "Event not found" }] }`

---

### GET /api/v1/events/categories

Static list of supported categories with display metadata.

**Response 200**
```json
{
  "data": [
    { "id": "POLICE", "label": "Police", "color": "#3B82F6", "icon": "shield" },
    { "id": "FIRE",   "label": "Fire",   "color": "#EF4444", "icon": "flame" }
  ]
}
```

---

### POST /api/v1/reports

Submit a community report.

**Rate limit:** 3 requests per IP per hour.

**Request body**
```json
{
  "category": "CRIME",
  "description": "Suspicious activity near the park",
  "lat": 43.6532,
  "lng": -79.3832,
  "photoBase64": "data:image/jpeg;base64,..."
}
```

**Validation**
- `category` — must be a valid Category enum value
- `description` — 10–500 characters
- `lat` / `lng` — must be within GTA bounding box
- `photoBase64` — optional, max 2 MB decoded

**Response 201**
```json
{
  "data": {
    "id": "uuid",
    "category": "CRIME",
    "status": "PENDING",
    "createdAt": "…"
  }
}
```

**Response 429** — rate limit exceeded  
**Response 422** — validation error with field-level details

---

### POST /api/v1/reports/:id/upvote

Upvote a community report. One upvote per IP per report.

**Rate limit:** 30 requests per IP per minute.

**Response 200**
```json
{
  "data": { "upvoteCount": 5 }
}
```

**Response 409** — already upvoted

---

## Error Codes

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Request body/params failed Zod validation |
| `NOT_FOUND` | Resource does not exist |
| `RATE_LIMITED` | Too many requests from this IP |
| `ALREADY_EXISTS` | Duplicate action (e.g. double upvote) |
| `INTERNAL_ERROR` | Unexpected server error |
