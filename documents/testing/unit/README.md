# Unit Testing Directory & Standards

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and the [System Overview](../../adapt_learn_graph_system_overview.md). Revised unit/API contracts must cover the four actors, discipline/role assignments, L&D baseline/publication/approval, Expert reviewed guidance and initial confirmation, and independent learning/evidence. Existing PASSED labels and runtime actor codes below are historical evidence, not revised-scope acceptance.
New feature specs keep open scoring/state/field choices open until agreed. Use per-REQ documents for real future runs; documentation checks do not replace runtime tests.

## Existing Execution Guides and Historical Evidence

**Location:** `backend/src/test/java/com/adaptlearngraph/<feature>/` and `frontend/src/`

Unit testing in this workspace validates pure domain invariants, application service logic, Spring MVC/Security endpoint contracts, and frontend presentation components in total isolation from persistent infrastructure.

> [!NOTE]
> Detailed test cases, boundary assertions, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Primary Actor | Test Document | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | `LEARNER` | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | **PASSED** |
| **REQ-001-F02** | Choose Target Role | `LEARNER` | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | **PASSED** |
| **REQ-011** | Assigned Target Roles | `DOMAIN_EXPERT` | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | **PASSED** |
| **REQ-012** | Micro-Skill Management | `DOMAIN_EXPERT` | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | **PASSED** |
| **REQ-015** | Role Requirements | `DOMAIN_EXPERT` | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | **PASSED** |
| **REQ-018** | Target-Role Graph Editing | `DOMAIN_EXPERT` | [REQ-018-target-role-graph-editing.md](REQ-018-target-role-graph-editing.md) | **PASSED** |
| **REQ-023** | Target Role Management | `LD_MANAGER` | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | **PASSED** |
| **REQ-024** | Expert Assignment | `LD_MANAGER` | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | **PASSED** |
| **Architecture** | Hexagonal Boundaries & Base | System / ArchUnit | [architecture-boundaries.md](architecture-boundaries.md) | **PASSED** |

---

## Execution Summaries

- The executable-test cluster for `REQ-001-F01` was approved and its domain/application, API/security and frontend component suites passed on 2026-09-30; cases and evidence are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md).
- `REQ-001-F02` Cluster 2 completed on 2026-10-02: T1 domain/command/hash passed 8 tests, T2 application policy/replay passed 15 tests, T3 HTTP/security passed 16 tests, and T5 frontend selection plus F01 regression passed 30 tests across eight files. Cases, deterministic fake boundaries, MVC/security slices, frontend fetch/hook fakes, and commands are tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md).
- Vitest is scoped to `src/**/*.test.{ts,tsx}`; Playwright specs live under `system-tests/` and are system evidence, not unit evidence. Other targets such as REQ-002 baseline allowance, REQ-015 required mastery and REQ-041 gap calculation remain plans only until their own scope is approved.

---

## How to Run Unit Tests

### Backend Unit Tests (JUnit 5 & ArchUnit)
Run pure unit and controller contract tests via Maven wrapper:
```powershell
# Run all unit tests
.\backend\mvnw.cmd -f backend/pom.xml test -Dtest="*Test,!*IntegrationTest,!*SchemaTest"

# Run a specific feature unit test
.\backend\mvnw.cmd -f backend/pom.xml test -Dtest="TargetRoleDomainTest,TargetRoleServiceTest"
```

### Frontend Component Tests (Vitest)
```powershell
cd frontend
npm test
```

---

## Standards for New Requirements

When implementing or updating a requirement (`REQ-nnn`):
1. **Create a dedicated file**: `documents/testing/unit/<REQ-ID>-<feature-slug>.md`.
2. **Include Acceptance Criteria**: Pin every test method to an AC from the corresponding `documents/features/<Feature>/<Function>.md`.
3. **Assert Architectural Completeness**: Explicitly verify all architecturally defined fields (e.g., track, seniority, responsibilities, version, assignedExpertId).
4. **Link to this index**: Add the requirement to the table above.


## Admin Research RQ2

- [REQ-033 Research RQ2](REQ-033-rq2-research.md)
- [REQ-034 Research RQ2](REQ-034-rq2-research.md)
- [REQ-035 Research RQ2](REQ-035-rq2-research.md)
