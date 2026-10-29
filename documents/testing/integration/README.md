# Integration Testing Directory & Standards

2026-10-29 selected review/read C4: [29 real-adapter cases and fixtures](../system/REQ-002-041-042-workspace-integration.md#real-integration-mapping) passed within final B160 (not an additional29). Disposable PostgreSQL17.6-alpine/Neo4j5.26-community cover full review aggregate, V34→V35/checksum/legacy preservation, CAS/replay/fault recovery, drift/fencing and read/no-write behavior. Versioned owner policies are test fixtures; production owner integration remains Open. [Commands/counts/history](../system/REQ-002-041-042-workspace-integration.md#evidence-identities-and-count-accounting); no C4 test or stack rerun.
2026-10-28 REQ-013/016 review catalog: [v0.11 teaching focus/difficulty evidence](REQ-016-teaching-focus-difficulty.md). Local data/artifact validation is separate from runtime database/API acceptance.

**Latest, 2026-10-24 REQ-001/002/009:** [Integration execution/blocker](REQ-001-002-009-20261024-execution.md): three selected real-adapter suites **Blocked**,0 business passes; raw2 setup errors/6 existing assumption skips because Docker Linux engine was unavailable. [Current gate audit](../system/REQ-001-002-009-cluster4-20261024-evidence.md): Cluster 3/4 incomplete. [23 October integration/131P aggregate](../system/REQ-001-002-cluster4-evidence.md) is historical; no current integration pass is carried forward.

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and [Version 2 contracts](../../features/README.md). Test organization/department/occupation/role boundaries, purchased plan versions and seat accounting, recoverable provisioning, L&D publication/approval, many-to-many learning coverage, private-content metadata, direct guidance, independent evidence, ROI inputs and idempotent processing against disposable stores. Assert every agreed architectural field after round-trip; do not invent fields from preview datasets.
Existing isolation fixtures and legacy actor checks remain baseline evidence; new registration, entitlement and access contracts need their own tests. PASSED labels below refer to prior contracts only.

## Existing Execution Guides and Historical Evidence

**Location:** `backend/src/test/java/com/adaptlearngraph/`

Integration testing validates real database round-trips, graph relationships, organization/assignment scope and constraints using disposable Testcontainers (PostgreSQL 16/17 and Neo4j 5.26-community), independent of shared development Compose volumes. Historical cross-organization fixtures do not by themselves prove the required onboarding workflow.

> [!NOTE]
> Detailed test cases, database fixtures, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Storage Engine | Test Document | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-019-F01 / REQ-020-F01/F02; direct REQ-042-F01 / REQ-004-F01** | Review persistence/concurrency/compatibility and read | PostgreSQL17.6 / Neo4j5.26 Testcontainers | [Actual methods, actors and fixtures](../system/REQ-002-041-042-workspace-integration.md#real-integration-mapping) | **29 Passed for mapped scope; production owners Open** |
| **REQ-060-F01-F03** | Registration, MFA, sessions and email jobs | PostgreSQL Testcontainers / real HTTP | [REQ-060-registration.md](REQ-060-registration.md) | **PASSED locally; live gate separate** |
| **REQ-001-F01** | View Target Roles | Neo4j Testcontainers | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | **PASSED** |
| **REQ-001-F02** | Choose Target Role | PostgreSQL Testcontainers | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | **PASSED** |
| **REQ-002-F02 historical V17** | Fixed Baseline Blueprint Authoring | PostgreSQL 17.6 + Neo4j 5.26 Testcontainers | [REQ-002-F02-baseline-authoring.md](REQ-002-F02-baseline-authoring.md) | **PASSED for superseded contract** |
| **REQ-011** | Assigned Target Roles | Neo4j Testcontainers | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Neo4j Testcontainers | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | **PASSED** |
| **REQ-015** | Role Requirements | Neo4j Testcontainers | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | **PASSED** |
| **REQ-018** | Target-Role Graph Editing | Neo4j Testcontainers | [REQ-018-target-role-graph-editing.md](REQ-018-target-role-graph-editing.md) | **PASSED** |
| **REQ-023** | Target Role Management | Neo4j Testcontainers | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Neo4j Testcontainers | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | **PASSED** |
| **Schema & Migrations** | Flyway V1-V13 & Graph Schema V1-V4 | Postgres & Neo4j Containers | [schema-and-migrations.md](schema-and-migrations.md) | **PASSED** |

---

## Baseline & Feature Evidence Summaries

- `DatabaseSchemaTest`: the 2026-10-15 full regression migrated PostgreSQL V1-V13 and passed; the rerun was a no-op. Earlier evidence remains historical only.
- `GraphSchemaTest`: the 2026-10-14 historical run failed on an obsolete 9-versus-16 count. Main now contains V4, drops the Course constraint, and updates the test to expect 15 constraints plus four migration records. This updated source compiled on 2026-10-15 with tests skipped; no post-merge executable result is claimed.
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
