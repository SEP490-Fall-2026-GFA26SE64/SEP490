# REQ-013 — Macro-Competency & Competency Ontology Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). This historical filename/ID associates competency ontology tests with REQ-013, while the stable current catalog assigns REQ-013 to learning module management. Do not treat ontology coverage as module/course/approval acceptance or silently reassign the ID; reconcile the historical traceability explicitly when requalifying tests.

## Historical Test Plan and Evidence

**Feature Contract:** [REQ-013 Competency Ontology / Macro-Competency](../../features/README.md)  
**Level:** Unit (Domain Record, Service Layer, Controller Contracts & Security RBAC)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-013-F01 AC01 | MacroCompetency domain record | Instantiate MacroCompetency with code, name, description | Validates non-null constraints, default ACTIVE status and timestamp initialization | `MacroCompetencyServiceTest.java` | **PASS** |
| **F01-U02** | REQ-013-F01 AC02 | MacroCompetency service and mock repository | Call `service.listMacroCompetencies(orgId)` | Delegates to outbound repository and returns non-empty list | `MacroCompetencyServiceTest.java` | **PASS** |
| **F01-A01** | REQ-013-F01 AC03 | Mock service; authenticated user | `GET /api/v1/organizations/{orgId}/macro-competencies` | `200 OK` with JSON array containing `id`, `code`, `name`, `description`, `status` | `MacroCompetencyControllerTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=MacroCompetencyControllerTest,MacroCompetencyServiceTest" test
# Result: PASS — 2 tests, 0 failures, 0 errors, 0 skips
```
