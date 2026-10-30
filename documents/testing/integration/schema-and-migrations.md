# Database Schema & Migration Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). PostgreSQL is forward-only through V13. Neo4j schema migration source is V1–V4: V4 removes the retired Course constraint, leaving 14 domain constraints plus `SchemaMigration.version`.

## Current Execution Evidence — 2026-10-15

| Component | Executable evidence | Result |
| :--- | :--- | :--- |
| PostgreSQL V1–V13 | `DatabaseSchemaTest` on disposable PostgreSQL 17.6 | **PASS** — clean migration and no-op rerun. |
| Occupation blueprint persistence | `BaselineAssessmentPostgresIntegrationTest` | **PASS 4/4** — V13 identity/uniqueness, immutable versions, UTC timestamps, review/publication guards. |
| Neo4j constraints V1–V4 | `GraphSchemaTest` on Neo4j 5.26 Community | **PASS 1/1** — 15 constraints and four migration records. |
| Neo4j Occupation catalog adapter | `Neo4jBaselineOccupationCatalogAdapterIntegrationTest` | **PASS 3/3** — list/detail, multi-Level skill union, inactive/empty/malformed boundaries. |

The complete backend regression passed 174/174 on 2026-10-15. The earlier graph-count failure was a stale seed assertion and is retained only in Git history, not as current evidence. Detailed commands and behavior mapping are in [REQ-002-F02](REQ-002-F02-baseline-authoring.md).

## Historical Test Plan and Evidence

**Scope:** PostgreSQL Flyway Migrations (V1–V6) and Neo4j Graph Schema / Constraints Migration  
**Level:** Integration (Testcontainers PostgreSQL 16 & Neo4j 5.26-community)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Scope / Component | Container / Fixture | Verification Trigger | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MIG-PG-01** | PostgreSQL Flyway V1–V6 | Testcontainers `postgres:16-alpine` | Run Flyway migration pipeline | All migrations V1–V6 apply cleanly in forward order; repeated run is idempotent | `DatabaseSchemaTest.java` | **PASS** |
| **MIG-PG-02** | Relational Catalog Isolation | Clean PostgreSQL schema | Inspect table catalog metadata | Zero relational target role or micro-skill tables exist in PostgreSQL per architecture | `DatabaseSchemaTest.java` | **PASS** |
| **MIG-NEO-01** | Neo4j Graph Constraints | Testcontainers `neo4j:5.26-community` | Execute Cypher migration scripts | Uniqueness constraints created for `TargetRole(code)`, `MicroSkill(code)`, etc. | `GraphSchemaTest.java` | **PASS** |
| **MIG-NEO-02** | Migration Idempotence | Neo4j schema migrations | Execute migration runner twice consecutively | Second execution recognizes applied version and avoids duplicate constraint collision | `GraphSchemaTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=DatabaseSchemaTest,GraphSchemaTest" test
# Result: PASS — All schema migrations applied and validated across real database containers
```
