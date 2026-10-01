# REQ-012 — Micro-Skill Management Unit Testing Plan & Evidence

**Feature Contract:** [REQ-012-F01 Create Micro-Skill](../../features/Micro-skill%20management/Create%20Micro-Skill.md)  
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

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=MicroSkillDomainTest,MicroSkillServiceTest,MicroSkillControllerTest" test
# Result: PASS — 9 tests, 0 failures, 0 errors, 0 skips
```
