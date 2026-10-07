# SIGN WELL R10.3 — Subscriber 360 Foundation

This module adds an opt-in Subscriber 360 foundation without changing the existing R10.2 newsletter OTP/CMS path.

## What is included
- PostgreSQL/Supabase schema with consent, OAuth connections, provenance, observations, vectors, recommendations, isolated sensitive vault and audit log.
- TypeScript backend skeleton for OAuth connection, consent gate, profile rebuild and erasure.
- Explainable interest scoring with time decay, source/event weighting and negative feedback.
- Newsletter ranker with diversity and freshness.
- Privacy Center front-end (`/profile.html`) with per-provider connect controls.
- Legal review matrix and threat model.

## Important deployment rule
**Unconnected platforms are never searched or guessed.** Identity joins happen only after the subscriber explicitly connects a provider using that provider's OAuth flow.

Google login uses `openid email profile`. Gmail message content is not requested. YouTube uses `youtube.readonly` only in the sample. Do not assume arbitrary watch history is available; ingest only objects the current official API actually returns for the authorized account.

Meta APIs and permission names evolve. The Threads/Instagram connector code is intentionally isolated: validate endpoints/scopes against the current Meta developer dashboard before production enablement and keep the connector disabled until App Review is complete.

## Deploy
1. Create a Supabase project and run `sql/001_subscriber360.sql`.
2. Copy `.env.example` to `.env`; create a fresh 32-byte encryption key. Never commit `.env`.
3. `npm install && npm run build`.
4. Replace the demo `x-signwell-subscriber-id` authentication stub in `src/server.ts` with your production session/JWT mapping before public deployment.
5. Configure Google/YouTube/Meta OAuth redirect URIs.
6. Complete provider verification/App Review as required.
7. Set `/assets/subscriber360-config.js` with the API origin and enable flag only after backend QA.
8. Have information counsel approve every row in `docs/LEGAL-REVIEW-MATRIX.csv` before enabling that data category.

## Production gates
- No access token in browser/localStorage/logs.
- No permissive Supabase RLS policy.
- No email-based social-account discovery.
- No scraping fallback.
- No political affiliation / disease / protected-trait inference.
- User deletion/export/consent withdrawal tested before launch.
