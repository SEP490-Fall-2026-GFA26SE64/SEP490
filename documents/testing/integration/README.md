# Integration Testing

**Location:** `backend/src/test/java/com/adaptlearngraph/`. Use disposable Testcontainers databases, not the development Compose volumes. Docker Desktop is required for `GraphSchemaTest` and `DatabaseSchemaTest`.

Current evidence:

- `DatabaseSchemaTest`: migrate PostgreSQL V1-V6, validate reruns, organization/account cross-scope foreign key, product actor codes, and existing schema guards.
- `GraphSchemaTest`: migrate graph constraints twice, seed twice, check V5 node/relationship keys and uniqueness, reject a changed migration checksum.

From the repository root on Windows:

```powershell
.\backend\mvnw.cmd -f backend/pom.xml test
```

As APIs are implemented, add tests for PostgreSQL-to-Neo4j catalog reference resolution, transaction/outbox handoff, organization isolation, stale graph references, and retries after a partially completed migration. These tests require a confirmed cross-store contract from [../../ARCHITECTURE.md](../../ARCHITECTURE.md); current schema tests do **not** prove those flows yet.

Each case should identify its feature ID, initial PostgreSQL and graph fixtures, API or job trigger, expected state in both stores, repeat/retry outcome, and test method.

REQ-001-F01 Neo4j adapter cases passed on 2026-09-30 and are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). They use a disposable Neo4j container with explicit Org A/Org B, inactive and catalog-invalid fixtures; the development seed and manual Compose smoke are not integration-test evidence.
