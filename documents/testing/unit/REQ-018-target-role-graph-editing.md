# REQ-018 — Target-Role Graph Editing Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Revalidate assigned-discipline/role graph access and separate L&D publication. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contract:**
- [REQ-018-F01 View Target-Role Graph](../../features/Learning%20catalog/README.md#req-018-f01)
- [REQ-018-F02 Edit Prerequisite Relationships](../../features/Learning%20catalog/README.md#req-018-f02)

**Level:** Unit (Domain Invariants, Application Services, Controllers, Security RBAC)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-018-F01 AC01 | TargetRoleGraph domain & service | Call `getTargetRoleGraphUseCase.execute(orgId, roleId)` | Returns populated `TargetRoleGraph` containing role metadata, required micro-skills list, and internal prerequisite edges | `PrerequisiteServiceTest.java` | **PASS** |
| **F01-A01** | REQ-018-F01 AC02 | MockMvc with `DOMAIN_EXPERT` / `LD_MANAGER` caller | `GET /api/v1/organizations/{orgId}/target-roles/{roleId}/graph` | `200 OK` with JSON graph payload | `TargetRoleGraphControllerTest.java` | **PASS** |
| **F01-A02** | REQ-018-F01 AC03 | MockMvc with `LEARNER` caller | `GET /api/v1/organizations/{orgId}/target-roles/{roleId}/graph` | `403 Forbidden`; unauthorized caller rejected | `TargetRoleGraphControllerTest.java` | **PASS** |
| **F02-U01** | REQ-018-F02 AC01 | PrerequisiteEdge domain & service | Call `managePrerequisiteUseCase.createPrerequisite(...)` with valid parameters | Creates `PrerequisiteEdge` with status `ACTIVE` and specified `minMastery` | `PrerequisiteServiceTest.java` | **PASS** |
| **F02-U02** | REQ-018-F02 Invariant | Domain model validation | Call `createPrerequisite` where `sourceSkillId == targetSkillId` | Throws `IllegalArgumentException("A micro-skill cannot be a prerequisite of itself")` | `PrerequisiteServiceTest.java` | **PASS** |
| **F02-U03** | REQ-018-F02 Invariant | DAG Cycle Detection | Mock repository reporting cycle path exists | Throws `PrerequisiteCycleException` | `PrerequisiteServiceTest.java` | **PASS** |
| **F02-U04** | REQ-018-F02 AC02 | Service & repository mock | Call `managePrerequisiteUseCase.deletePrerequisite(orgId, sourceId, targetId)` | Deletes relationship cleanly | `PrerequisiteServiceTest.java` | **PASS** |
| **F02-A01** | REQ-018-F02 AC01 | MockMvc `POST /api/v1/organizations/{orgId}/prerequisites` with valid body | Valid DTO (`sourceSkillId`, `targetSkillId`, `minMastery: 0.85`) | `201 Created` with created prerequisite DTO | `PrerequisiteControllerTest.java` | **PASS** |
| **F02-A02** | REQ-018-F02 AC01 | MockMvc `POST` with `minMastery: 1.5` | Out-of-bounds `minMastery` (> 1.0) | `400 Bad Request` validation error | `PrerequisiteControllerTest.java` | **PASS** |
| **F02-A03** | REQ-018-F02 AC01 | MockMvc `POST` causing cyclic dependency | Cycle path reported | `400 Bad Request` with message containing "cycle" | `PrerequisiteControllerTest.java` | **PASS** |
| **F02-A04** | REQ-018-F02 AC02 | MockMvc `DELETE /api/v1/organizations/{orgId}/prerequisites` | Valid query params (`sourceSkillId`, `targetSkillId`) | `204 No Content` | `PrerequisiteControllerTest.java` | **PASS** |
| **F02-A05** | REQ-018-F02 AC03 | MockMvc `GET /api/v1/organizations/{orgId}/prerequisites` | Organization scope | `200 OK` with JSON array of prerequisite relationships | `PrerequisiteControllerTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
.\backend\mvnw.cmd -f backend/pom.xml test '-Dtest=PrerequisiteServiceTest,PrerequisiteControllerTest,TargetRoleGraphControllerTest'
```

Output:
```
[INFO] Running com.adaptlearngraph.competency.PrerequisiteServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.017 s
[INFO] Running REQ-018-F02: Prerequisite HTTP Controller Tests
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.481 s
[INFO] Running REQ-018-F01: Target Role Graph HTTP Controller Tests
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.388 s
[INFO] BUILD SUCCESS (13 tests run, 0 failures, 0 errors, 0 skipped)
```
