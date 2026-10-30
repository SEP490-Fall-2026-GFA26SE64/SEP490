# REQ-001-F01 — View Target Roles Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Historical `ACTIVE`/catalog-valid tests do not certify L&D publication or reviewed guidance. Original dates/counts are preserved; revised scope needs new acceptance/tests.

## Historical Test Plan and Evidence

**Feature Contract:** [REQ-001-F01 View Target Roles](../../features/Role%20catalog/README.md#req-001-f01)<br>
**Level:** Unit (Domain Invariants, Application Services, Controller Contracts & Frontend Components)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | AC03, AC05 | Valid professional and management role data | Construct TargetRole domain entity | Valid track-grade pairs (P1–P5, M3–M4) and required fields accepted | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F01-U02** | AC03 | Invalid track-grade, blank fields, invalid mastery | Construct domain output | Invalid catalog data rejected with `IllegalArgumentException` | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F01-U03** | AC01, AC04, AC07, AC08 | Fake actor/catalog ports for Org A / Org B | List & detail service query | Authorization, normalization, AND filters, stable sort and error mapping match contract | [TargetRoleQueryServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleQueryServiceTest.java) | **PASS** |
| **F01-A01** | AC01, AC04, AC07, AC08 | Local actor enabled/disabled; valid and invalid HTTP input | Call list/detail HTTP endpoints | `200/400/403/404/503` envelope and no client tenant field exposure | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java), [TargetRoleProductionBoundaryTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleProductionBoundaryTest.java) | **PASS** |
| **F01-FE01** | AC04, AC06, AC07, AC08, AC10 | Mock HTTP responses, no selection callback | Search, filter, open detail, retry, back | Visible UI states match contract; browse view never alters selection | `frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.test.tsx`, `targetRoleApi.test.ts` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleDomainTest,TargetRoleQueryServiceTest" test
# Result: PASS — 17 tests, 0 failures, 0 errors, 0 skips

backend\mvnw.cmd "-Dtest=TargetRoleControllerTest,TargetRoleProductionBoundaryTest" test
# Result: PASS — 7 tests, 0 failures, 0 errors, 0 skips (including 401/403 actor error mapping)

cd frontend; npm test
# Result: PASS — 2 test files, 6 tests passing
```
