# REQ-012 — Micro-Skill Management Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Revalidate assigned-discipline descriptions/proficiency, lifecycle and reference retention. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contract:**
- [REQ-012-F01 Create Micro-Skill](../../features/Learning%20catalog/README.md#req-012-f01)
- [REQ-012-F02 View Micro-Skills](../../features/Learning%20catalog/README.md#req-012-f02)
- [REQ-012-F03 Update Micro-Skill](../../features/Learning%20catalog/README.md#req-012-f03)
- [REQ-012-F04 Delete Micro-Skill](../../features/README.md#removed-scope)

**Level:** Unit (Domain Model, Service Layer, Controller Contracts & Security RBAC)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-012-F01 AC01 | MicroSkill domain entity | Construct MicroSkill with non-blank code, name, and macroCompetencyCode | Successfully creates domain model; validates non-blank constraints and uppercase code normalization | `MicroSkillDomainTest.java` | **PASS** |
| **F01-U02** | REQ-012-F01 AC02 | MicroSkill service and in-memory mock repository | Call `createMicroSkill` with existing code in the same organization | Rejects with `DuplicateMicroSkillException` (409 Conflict) | `MicroSkillServiceTest.java` | **PASS** |
| **F01-U03** | REQ-012-F01 AC04 | MicroSkill service | Call `createMicroSkill` with invalid macro-competency reference | Rejects with `IllegalArgumentException` / validation failure | `MicroSkillServiceTest.java` | **PASS** |
| **F01-A01** | REQ-012-F01 AC03 | Mock service; `DOMAIN_EXPERT` vs `LEARNER` caller | `POST /api/v1/organizations/{orgId}/micro-skills` | `201 Created` with MicroSkill payload for Domain Expert; `403 Forbidden` for non-expert | `MicroSkillControllerTest.java` | **PASS** |
| **F01-A02** | REQ-012-F01 AC01 | Mock service; invalid request payload | `POST /api/v1/organizations/{orgId}/micro-skills` with blank code | `400 Bad Request` with descriptive field validation error | `MicroSkillControllerTest.java` | **PASS** |
| **F02-U01** | REQ-012-F02 AC01 | MicroSkill service and in-memory mock repository | Call `service.listMicroSkills(organizationId)` | Returns list of micro-skills filtered by organization | `MicroSkillServiceTest.java` | **PASS** |
| **F02-A01** | REQ-012-F02 AC02 | Mock service with seeded micro-skills | `GET /api/v1/organizations/{orgId}/micro-skills` | `200 OK` with JSON array containing code, name, description, macroCompetencyCode | `MicroSkillControllerTest.java` | **PASS** |
| **F03-U01** | REQ-012-F03 AC01 | MicroSkill service and repository mock | Call `service.updateMicroSkill(orgId, skillId, name, desc, status)` | Updates skill name, description, and status; updates `updatedAt` timestamp | `MicroSkillServiceTest.java` | **PASS** |
| **F03-A01** | REQ-012-F03 AC02 | MockMvc `PUT /api/v1/organizations/{orgId}/micro-skills/{skillId}` | Valid update DTO | `200 OK` with updated MicroSkill DTO | `MicroSkillControllerTest.java` | **PASS** |
| **F04-U01** | REQ-012-F04 AC01 | MicroSkill service and repository mock | Call `deleteMicroSkill` on skill in use by target role or prerequisite | Throws `MicroSkillInUseException` (409 Conflict) | `MicroSkillServiceTest.java` | **PASS** |
| **F04-U02** | REQ-012-F04 AC02 | MicroSkill service and repository mock | Call `deleteMicroSkill` on unreferenced skill | Repository `delete` invoked cleanly; returns void | `MicroSkillServiceTest.java` | **PASS** |
| **F04-A01** | REQ-012-F04 AC03 | MockMvc `DELETE /api/v1/organizations/{orgId}/micro-skills/{skillId}` | Skill in use | `409 Conflict` with error message | `MicroSkillControllerTest.java` | **PASS** |
| **F04-A02** | REQ-012-F04 AC02 | MockMvc `DELETE /api/v1/organizations/{orgId}/micro-skills/{skillId}` | Unused skill | `204 No Content` | `MicroSkillControllerTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
.\backend\mvnw.cmd -f backend/pom.xml test '-Dtest=MicroSkillDomainTest,MicroSkillServiceTest,MicroSkillControllerTest'
```

Output:
```
[INFO] Running REQ-012: MicroSkill HTTP Controller Tests
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.222 s
[INFO] Running REQ-012-F01: MicroSkill Domain Invariants
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.011 s
[INFO] Running REQ-012: MicroSkill Application Service Tests
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.030 s
[INFO] BUILD SUCCESS (16 tests run, 0 failures, 0 errors, 0 skipped)
```
