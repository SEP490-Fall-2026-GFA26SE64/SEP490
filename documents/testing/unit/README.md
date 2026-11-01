# Unit Testing Directory & Standards

2026-10-29 selected review/read C4: [unit/component/API-security mapping](../system/REQ-002-041-042-workspace-integration.md#unit-component-and-api-security-mapping) and [recorded commands](../system/REQ-002-041-042-workspace-integration.md#recorded-commands) reuse the existing scoped evidence document. B includes92 C3 non-integration cases (66 domain/application/codec +26 API/security/activation/actor bridge) and39 regression; F49 includes44 C3+5 regression. Real integration29 is indexed separately and is already part of B160. Mock ports/session/HTTP/owner hooks are not real-adapter evidence. C4 only synchronized documents; no tests rerun.
## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and [Version 2 contracts](../../features/README.md). Revised unit/API contracts cover six actors, organization/occupation/role permissions, registration/payment/renewal/seat policies, L&D baseline/publication/approval, direct AI guidance, Expert initial confirmation, independent evidence and ROI edge cases. Existing PASSED labels and runtime actor codes below remain historical evidence, not Version 2 acceptance.
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
| **REQ-014 / FR-05.06 subset** | Question Bank authoring | Expert / L&D | [REQ-014-question-bank.md](REQ-014-question-bank.md) | **16 domain + 3 catalog deadline + 3 architecture + 10 frontend checks passed; system separate** |
| **REQ-019-F01 / REQ-020-F01/F02; direct REQ-042-F01 / REQ-004-F01** | Review/order/repair/approval and safe own read | Assigned Expert / Employee | [Scoped methods and mocks](../system/REQ-002-041-042-workspace-integration.md#unit-component-and-api-security-mapping) | **Passed for mapped review/read scope; production owners separate** |
| **REQ-060-F01-F03** | Registration, email and MFA/resume | Guest | [REQ-060-registration.md](REQ-060-registration.md) | **PASSED locally; live gate separate** |
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
