# REQ-023 — Target Role Management test plan and evidence

**Status:** Unit, Controller/Security, Neo4j Testcontainers Integration, and System API tests passed; manual browser verification checklist completed.  
**Dedicated Level Evidence:** [Unit Test](unit/REQ-023-target-role-management.md) | [Integration Test](integration/REQ-023-target-role-management.md) | [System Test](system/REQ-023-target-role-management.md)  
**Feature contracts:**
- [REQ-023-F01 Create Target Role](../features/Target%20role%20management/Create%20Target%20Role.md)
- [REQ-023-F02 View Organization Target Roles](../features/Target%20role%20management/View%20Organization%20Target%20Roles.md)
- [REQ-023-F03 Update Target Role](../features/Target%20role%20management/Update%20Target%20Role.md)
- [REQ-023-F04 Delete Target Role](../features/Target%20role%20management/Delete%20Target%20Role.md)
- [REQ-023-F05 Expert Assigned Roles & Isolation](../features/Target%20role%20management/Expert%20Assigned%20Target%20Roles.md)

Under [ARCHITECTURE.md](../ARCHITECTURE.md) and [neo4j_schema.md](../neo4j_schema.md), the catalog graph (`JobDomain`, `TargetRole`, `MacroCompetency`, `MicroSkill`, `LearningModule` and the 7 directed relationships) is stored exclusively in **Neo4j 5.26 Community** via `Neo4jTargetRoleRepository`. PostgreSQL maintains strictly forward-only Flyway migrations V1–V6 without relational target-role tables.

---

## Test Cases

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-023-F01 AC01/AC02 | Unit/domain | TargetRole entity with track, domainCode, familyCode, version | Construct new TargetRole | Defaults to `DRAFT` status, normalizes code to uppercase, validates non-blank fields | `backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java` | **PASS** 2026-10-01 |
| **F01-U02** | REQ-023-F01 AC03 | Unit/application | InMemory repository with existing code & version | Call `createTargetRole` with same code & version | Rejects with `DuplicateTargetRoleException` (409 Conflict) | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F01-U03** | REQ-023-F01 AC07 | Unit/domain | TargetRole track-seniority matching & responsibilities list | Create TargetRole with Seniority and Responsibilities | Enforces P1–P5 for PROFESSIONAL and M3–M4 for MANAGEMENT; rejects invalid combinations | `backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java` | **PASS** 2026-10-01 |
| **F01-A01** | REQ-023-F01 AC01/AC04 | MVC/security | Mock service; `LD_MANAGER` caller vs `LEARNER` caller | `POST /api/v1/organizations/{orgId}/target-roles` | `201 Created` with role payload for L&D Manager; `403 Forbidden` for non-manager | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F01-A02** | REQ-023-F01 AC08 | MVC/security | Mock service; track and seniority mismatch payload | `POST /api/v1/organizations/{orgId}/target-roles` with track=MANAGEMENT, seniority=P3 | Rejects with `400 Bad Request` and descriptive error message | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F02-U01** | REQ-023-F02 AC01/AC02 | Unit/application | Roles across `org-alpha` and `org-beta` with various tracks, statuses, and assigned experts | Call `listTargetRoles` with `TargetRoleFilter` | Multi-tenant isolation holds; search keywords, track, domain, and expert filters evaluate correctly | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F02-A01** | REQ-023-F02 AC01/AC03 | MVC/security | Mock service with role list | `GET /api/v1/organizations/{orgId}/target-roles` | `200 OK` with JSON array; single role lookup returns `200 OK` or `404 Not Found` | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F03-U01** | REQ-023-F03 AC01/AC02 | Unit/application | Existing target role in `DRAFT` status | Call `updateTargetRole` with new title, track, expert | Updates mutable fields while preserving immutable code and identity | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F03-U02** | REQ-023-F03 AC04 | Unit/application | Existing target role | Call `updateTargetRole` with updated seniority and responsibilities | Correctly persists new seniority and non-empty responsibilities array | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F03-A01** | REQ-023-F03 AC03 | MVC/security | Mock service; valid update payload | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | `200 OK` with updated TargetRoleDTO; `404 Not Found` if role does not exist | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F04-U01** | REQ-023-F04 AC01 | Unit/application | Existing target role (both `DRAFT` and `ACTIVE`) | Call `deleteTargetRole` | Successfully deletes role from repository; returns false when role not found | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F04-A01** | REQ-023-F04 AC02 | MVC/security | Mock service; `LD_MANAGER` caller | `DELETE /api/v1/organizations/{orgId}/target-roles/{roleId}` | `204 No Content` on successful deletion; `404 Not Found` when nonexistent | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F05-A01** | REQ-023-F05 AC01 | MVC/security | `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-chen` | `GET /api/v1/organizations/{orgId}/target-roles` | Automatically injects `assignedExpertId = expert-chen` filter; hides other experts' roles | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F05-A02** | REQ-023-F05 AC04 | MVC/security | `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-alpha`, payload with `status = REJECTED` and `rejectionReason` | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Transitions status to `REJECTED`, persists `rejectionReason`, returns 200 OK | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F01-I01** | REQ-023-F01 AC01/AC02 | Neo4j integration | Disposable `neo4j:5.26-community` container with schema constraints migrated | `save` TargetRole in `org-alpha` and `org-beta` via `Neo4jTargetRoleRepository` | Persists node with `id, organizationId, code, domainCode, familyCode, track, seniority, responsibilities, version, status`; verifies strict multi-tenant isolation | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-I02** | REQ-023-F01 AC05 | Neo4j integration | Disposable Neo4j container with `MicroSkill` node | `save` TargetRole with `skillTargets` JSON array | Creates `(:TargetRole)-[req:REQUIRES_SKILL]->(:MicroSkill)` with `targetMastery = threshold / 100.0`; reading back dynamically reconstructs `skillTargets` from graph edges | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-I03** | REQ-023-F01 AC06 | Neo4j integration | Disposable Neo4j container with existing active v1.0 TargetRole | `save` successor draft with same code and `version = '1.1'` | Persists v1.1 alongside v1.0 without violating `target_role_code` uniqueness; verifies both versions queryable | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-I04** | REQ-023-F04 AC01 | Neo4j integration | TargetRole with active `[:REQUIRES_SKILL]` and `[:HAS_ROLE]` graph edges | `deleteById` on `Neo4jTargetRoleRepository` | Executes `DETACH DELETE r`; removes role and all its edges while preserving connected `MicroSkill` nodes | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-S01** | REQ-023 End-to-End | System | Complete Compose dev stack (`compose.dev.yml`) with active Postgres and Neo4j | End-to-end role lifecycle: L&D Manager creates role, expert authors micro-skills, publishes to graph, L&D Manager creates successor draft v1.1 | Live graph queries reflect node and edge updates immediately; no relational catalog table used | Local development Compose environment | **PASS** 2026-09-30 |

---

## Execution Order

1. **Domain & Application Unit Tests**: Verify pure domain invariants, track rules, seniority spectrum, responsibilities, versioning, and service-level duplicate/isolation logic without Spring or database dependencies.
2. **Controller & Security Contract Tests**: Verify HTTP envelopes (`200`, `201`, `204`, `400`, `403`, `404`, `409`), track-seniority validation error handling, role-based access control (`LD_MANAGER` vs `DOMAIN_EXPERT`), and header validation.
3. **Neo4j Testcontainers Integration Tests**: Spin up clean, disposable `neo4j:5.26-community` instances to test Cypher MERGE, `seniority`, `responsibilities`, `[:REQUIRES_SKILL]` and `[:HAS_ROLE]` graph edge creation, dynamic edge-to-DTO reconstruction, and successor draft multi-version co-existence.
4. **PostgreSQL Schema Isolation Tests**: Confirm Flyway applies strictly migrations V1–V6 with zero relational catalog tables.
5. **System / Compose Stack Verification**: Validate end-to-end workflows against the live Compose services.

---

## Execution Evidence — 2026-10-01

- `.\backend\mvnw.cmd -f backend/pom.xml test`:
  **PASS** — **72 tests**, 0 failures, 0 errors, 0 skips (including all domain invariants, ArchUnit hexagonal architecture checks, Testcontainers Neo4j/Postgres migrations, and controller endpoints).
- `npm test -- --run` (in `frontend/`):
  **PASS** — Vitest component and API contract tests (6 passed).
- `npm run build` (in `frontend/`):
  **PASS** — Production bundle compiled successfully with zero TypeScript or syntax errors (`tsc -b && vite build`).
- **UI & UX Refinements (UI-UX Pro Max)**:
  - Single-line responsive display for Track and Seniority badges.
  - Redesigned and polished Delete Confirmation Modal using design system tokens.
  - Reusable `<Pagination />` component with hardcoded `pageSize = 10`, single-line navigation buttons (`< Prev` and `Next >`), and removed redundant rows-per-page dropdowns.
  - High-priority chronological queue sorting placing newly created and dispatched `sent` draft roles at the top of the Expert and L&D Manager tables.
  - Standardized date formatting: ISO timestamps rendered cleanly as `DD/MM/YYYY` (e.g., `01/10/2026`).

---

## Live System Verification Evidence

Verified against the running Compose development stack (`http://127.0.0.1:8088`):
1. `GET /api/v1/system/status` returned `{"application":"adapt-learn-graph","version":"0.1.0-SNAPSHOT","stage":"SCAFFOLD"}`.
2. `GET /api/v1/organizations/comp-technova/target-roles` with `X-User-Role: LD_MANAGER` returned 5 seeded target roles with their micro-skill target arrays dynamically constructed from Neo4j `[:REQUIRES_SKILL]` relationships (`ROLE-AI-ARCH`, `ROLE-GENAI-01`, `ROLE-MLOPS-02`, `JAVA_BACKEND_P3`).
3. `POST /api/v1/organizations/comp-technova/target-roles` successfully created successor draft `ROLE-AI-ARCH` (v1.1) in `DRAFT` status with `[:REQUIRES_SKILL]` edge to `MS-PY-001`.
4. Subsequent `GET` confirmed both v1.0 and v1.1 returned in the catalog response, with v1.1 positioned for expert authoring while v1.0 remains active for learner pathways.

Manual interactive procedure: [system/REQ-023-manual-browser-check.md](system/REQ-023-manual-browser-check.md).
