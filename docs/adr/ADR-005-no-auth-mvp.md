# ADR-005: No Authentication in MVP

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Community reports need some form of anti-spam protection. The options are:
1. Require user accounts (email/OAuth)
2. Anonymous with IP-based rate limiting

Authentication adds significant complexity: token management, session storage, OAuth flows, PIPEDA compliance for user data storage, password reset flows, and at least 2 weeks of development time.

## Decision

**MVP: No authentication.** Community reports are anonymous and rate-limited by IP hash.

**Anti-spam measures:**
- 3 reports per IP per hour (enforced in Redis)
- 1 upvote per IP per report (database UNIQUE constraint)
- Confidence scoring: new anonymous reports start at 30/100 and must earn upvotes to gain visibility
- Duplicate detection: near-duplicate reports are merged
- IP is SHA-256 hashed before storage — not raw PII

## Why this is acceptable for MVP

- Reduces time to ship by ~2 weeks
- No PIPEDA obligations around user accounts
- Confidence scoring limits the damage from spam (low-score reports have low visibility)
- Rate limiting prevents bulk submission
- We can add auth post-MVP without schema migration (the `ip_hash` field can coexist with a future `user_id` FK)

## Post-MVP Plan

Auth.js (Google + GitHub OAuth + magic links) will be added in Phase 5. User accounts will unlock:
- Saved filter preferences (server-side)
- Report history and reputation
- Moderator role
- Relaxed rate limits for trusted users

## Consequences

- Reports cannot be edited or deleted by the submitter (no way to verify identity)
- Moderators must manually reject spam reports via admin tooling (Phase 5)
- Privacy policy must clearly state that IP hashes are stored for rate limiting
