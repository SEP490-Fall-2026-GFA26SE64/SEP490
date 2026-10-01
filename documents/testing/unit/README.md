# Unit Testing Directory & Standards

**Location:** `backend/src/test/java/com/adaptlearngraph/<feature>/` and `frontend/src/`

Unit testing in this workspace validates pure domain invariants, application service logic, Spring MVC/Security endpoint contracts, and frontend presentation components in total isolation from persistent infrastructure.

> [!NOTE]
> Detailed test cases, boundary assertions, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Primary Actor | Test Document | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | `LEARNER` | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | **PASSED** |
| **REQ-011** | Assigned Target Roles | `DOMAIN_EXPERT` | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | **PASSED** |
| **REQ-012** | Micro-Skill Management | `DOMAIN_EXPERT` | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | **PASSED** |
| **REQ-015** | Role Requirements | `DOMAIN_EXPERT` | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | **PASSED** |
| **REQ-023** | Target Role Management | `LD_MANAGER` | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | **PASSED** |
| **REQ-024** | Expert Assignment | `LD_MANAGER` | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | **PASSED** |
| **Architecture** | Hexagonal Boundaries & Base | System / ArchUnit | [architecture-boundaries.md](architecture-boundaries.md) | **PASSED** |

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
