# Integration Testing Directory & Standards

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and the [System Overview](../../adapt_learn_graph_system_overview.md). Test agreed discipline/role assignment, L&D publication/approval, reviewed guidance, independent progress/evidence, retained versions and idempotent tracing/pathways against disposable stores. Assert every agreed architectural field after round-trip; do not invent new fields from preview datasets.
Existing organization isolation fixtures and legacy actor-code checks remain technical baseline evidence. They do not require multi-organization registration or certify new actor permissions. PASSED labels below refer to prior contracts only.

## Existing Execution Guides and Historical Evidence

**Location:** `backend/src/test/java/com/adaptlearngraph/`

Integration testing validates real database round-trips, graph relationships, authorized organization/assignment scope, and constraints using disposable Testcontainers (PostgreSQL 16/17 and Neo4j 5.26-community), independent of shared development Compose volumes. Historical cross-organization fixtures remain defense-in-depth, not a SaaS registration workflow.

> [!NOTE]
> Detailed test cases, database fixtures, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Storage Engine | Test Document | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | Neo4j Testcontainers | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | **PASSED** |
| **REQ-001-F02** | Choose Target Role | PostgreSQL Testcontainers | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | **PASSED** |
| **REQ-002-F02** | Baseline Blueprint Authoring | PostgreSQL 17.6 Testcontainers | [REQ-002-F02-baseline-authoring.md](REQ-002-F02-baseline-authoring.md) | **PASSED** |
| **REQ-011** | Assigned Target Roles | Neo4j Testcontainers | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Neo4j Testcontainers | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | **PASSED** |
| **REQ-015** | Role Requirements | Neo4j Testcontainers | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | **PASSED** |
| **REQ-018** | Target-Role Graph Editing | Neo4j Testcontainers | [REQ-018-target-role-graph-editing.md](REQ-018-target-role-graph-editing.md) | **PASSED** |
| **REQ-023** | Target Role Management | Neo4j Testcontainers | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Neo4j Testcontainers | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | **PASSED** |
| **Schema & Migrations** | Flyway V1-V7 & Graph Schema | Postgres & Neo4j Containers | [schema-and-migrations.md](schema-and-migrations.md) | **PASSED** |

---

## Baseline & Feature Evidence Summaries

- `DatabaseSchemaTest`: migrate PostgreSQL V1-V7, validate reruns, organization/account cross-scope foreign key, product actor codes, and existing schema guards.
- `GraphSchemaTest`: migrate graph constraints twice, seed twice, check V5 node/relationship keys and uniqueness, reject a changed migration checksum.
- `REQ-001-F01`: Neo4j adapter cases passed on 2026-09-30 and are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). They use a disposable Neo4j container with explicit Org A/Org B, inactive and catalog-invalid fixtures; the development seed and manual Compose smoke are not integration-test evidence.
- `REQ-001-F02`: T4 PostgreSQL tests were created and passed on 2026-10-02 and are tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md). Seven disposable PostgreSQL 17.6 cases cover Flyway V1–V7, lifecycle/replay, uniqueness/concurrency, rollback, provisional pathway behavior, the F01/PostgreSQL reference bridge, and repeatable two-role development references; the configured assessment contract adds one non-container case. Final rerun: 8 tests, 0 failures/errors/skips. The development seed is not a test oracle, and the F01 recording port does not replace real Neo4j/Catalog-owner integration.

---

## How to Run Integration Tests

Docker Desktop must be running to support Testcontainers.

From the repository root on Windows:
```powershell
# Run all integration tests
.\backend\mvnw.cmd -f backend/pom.xml test -Dtest="*IntegrationTest,*SchemaTest"

# Run a specific feature integration test
.\backend\mvnw.cmd -f backend/pom.xml test -Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest
```

---

## Standards for New Requirements

When writing integration tests for a new requirement (`REQ-nnn`):
1. **Create a dedicated file**: `documents/testing/integration/<REQ-ID>-<feature-slug>.md`.
2. **Specify Container Fixtures**: Define the exact Testcontainers image (e.g. `neo4j:5.26-community`), seed nodes, and tenant isolation scope (`org-alpha` vs `org-beta`).
3. **Verify Database Persistence**: Assert that every architecturally defined field is accurately persisted and reconstructed upon reading back.
4. **Link to this index**: Add the requirement to the table above.
