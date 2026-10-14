# Database Schema & Migration Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). Existing migrations and actor codes remain technical history, not proof of the revised product schema/permissions. No migration changed in this documentation task; new scope mappings need approved contracts and fresh tests.

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
