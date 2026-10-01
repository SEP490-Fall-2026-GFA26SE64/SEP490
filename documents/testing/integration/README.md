# Integration Testing Directory & Standards

**Location:** `backend/src/test/java/com/adaptlearngraph/`

Integration testing in this workspace validates real database round-trips, graph edge creation, multi-tenant isolation, and constraint enforcement using disposable Testcontainers (PostgreSQL 16 and Neo4j 5.26-community), completely independent of shared development Compose volumes.

> [!NOTE]
> Detailed test cases, database fixtures, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Storage Engine | Test Document | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | Neo4j Testcontainers | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | **PASSED** |
| **REQ-011** | Assigned Target Roles | Neo4j Testcontainers | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Neo4j Testcontainers | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | **PASSED** |
| **REQ-015** | Role Requirements | Neo4j Testcontainers | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | **PASSED** |
| **REQ-023** | Target Role Management | Neo4j Testcontainers | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Neo4j Testcontainers | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | **PASSED** |
| **Schema & Migrations** | Flyway V1-V6 & Graph Schema | Postgres & Neo4j Containers | [schema-and-migrations.md](schema-and-migrations.md) | **PASSED** |

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
