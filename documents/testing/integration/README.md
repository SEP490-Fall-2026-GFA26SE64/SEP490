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

## Integration Test Evidence

- REQ-001-F01 Neo4j adapter cases passed on 2026-09-30 and are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). They use a disposable Neo4j container with explicit Org A/Org B, inactive and catalog-invalid fixtures; the development seed and manual Compose smoke are not integration-test evidence.

| Feature / REQ | Scope & Assertions Tested | Test File & Container | Run Date | Result |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-023-F01, REQ-023-F02, REQ-023-F03, REQ-023-F04, REQ-011-F01, REQ-012-F01** | - TargetRole saved directly to real Neo4j database with initial `DRAFT` status<br>- Multi-tenant isolation verified: `org-alpha` and `org-beta` roles do not bleed across boundaries<br>- REQ-023-F03: TargetRole details updated in Neo4j (track, family, assignedExpertId)<br>- REQ-011-F01 / REQ-023-F05: Cypher filter on `assignedExpertId` tested in real graph<br>- REQ-023-F04: TargetRole permanently deleted with `DETACH DELETE` while micro-skills remain intact<br>- REQ-012-F01: MicroSkill saved to Neo4j with active tenant isolation and `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)` graph edge<br>- `(:TargetRole)-[:REQUIRES_SKILL]->(:MicroSkill)` graph edge creation with `targetMastery`<br>- Reconstructing required skills directly from Neo4j graph relationships on read<br>- Successor draft (v1.1) persistence alongside active v1.0 without Neo4j constraint collision | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java`<br>(Container: `neo4j:5.26-community`) | 2026-09-30 | **PASSED** |
