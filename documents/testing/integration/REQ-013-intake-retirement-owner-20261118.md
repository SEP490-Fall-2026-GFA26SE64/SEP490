# REQ-013 — intake retirement persistence limits, 2026-11-18

Not Run: PostgreSQL/Neo4j integration and Compose scenarios. No schema migration or live database change was made. Existing intake storage, source reconciliation, historical references and delete protection are retained.

The historical ModuleAuthoringIntegrationTest fixture now writes an already-accepted historical record directly through its test adapter, rather than calling the retired operational service. Its existing replay/drift assertions remain; it was not executed, and the normal test compiler is blocked by existing stale field signatures elsewhere in that class and other tests. No persistence pass is claimed.

User confirmed all current modules already have responsible owners; this was not independently checked against a live database. Scoped mock/API checks are recorded in [unit evidence](../unit/REQ-013-intake-retirement-owner-20261118.md).
