# Threat model

- Account mis-binding: signed state, short expiry, provider subject uniqueness, re-auth on reconnect.
- Token leakage: AES-256-GCM at rest; never log access/refresh tokens; server-only storage.
- Cross-user mix-up: every observation requires subscriber_id; unique provider subject; integration tests for tenant boundaries.
- Wrong profile merge: no email-based social reverse lookup. Only explicit OAuth connection joins identities.
- Employee snooping: service endpoint RBAC + immutable audit log + least-privilege admin roles.
- Over-inference: hard denylist in ingestion/model layer; sensitive vault excluded from recommendation engine.
- Incomplete deletion: cascading DB deletion + retention_jobs + provider token revocation + backup-retention procedure.
- Webhook spoofing: verify provider signatures/timestamps before ingest; replay nonce cache.
- Prompt injection from social text: social text is data, never system instructions; classify with fixed schema and strip tool directives.
