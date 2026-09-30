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

---

## Sprint 1 Integration Test Evidence

| Feature / REQ | Scope & Assertions Tested | Test File & Container | Run Date | Result |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-023-F01, REQ-023-F02, REQ-023-F03, REQ-023-F04, REQ-011-F01, REQ-012-F01** | - TargetRole saved to real Neo4j database with initial `DRAFT` status<br>- Multi-tenant isolation verified: `org-alpha` and `org-beta` roles do not bleed across boundaries<br>- REQ-023-F03: TargetRole details updated in Neo4j (track, family, assignedExpertId)<br>- REQ-011-F01 / REQ-023-F05: Cypher filter on `assignedExpertId` tested in real graph<br>- REQ-023-F04: TargetRole permanently deleted with `DETACH DELETE` while micro-skills remain intact<br>- REQ-012-F01: MicroSkill saved to Neo4j with active tenant isolation and `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)` graph edge | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java`<br>(Container: `neo4j:5.26-community`) | 2026-09-29 | **PASSED** |