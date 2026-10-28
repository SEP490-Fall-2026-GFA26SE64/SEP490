# REQ-001-F01 — View Target Roles Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). Recorded catalog/organization fixtures do not certify L&D publication or reviewed guidance. Preserve original test dates/counts and revalidate new gates after implementation.

## Historical Test Plan and Evidence

**Feature Contract:** [REQ-001-F01 View Target Roles](../../features/Role%20catalog/README.md#req-001-f01)<br>
**Level:** Integration (Neo4j Testcontainers Catalog Adapter)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | AC02, AC03, AC05, AC07, AC09 | Disposable `neo4j:5.26-community` container; Org A and Org B roles including invalid/inactive graph nodes | Call `Neo4jTargetRoleCatalogAdapter` methods | Tenant isolation holds; catalog validity, full property mapping, and current-state reread verified | [Neo4jTargetRoleCatalogAdapterTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/infrastructure/Neo4jTargetRoleCatalogAdapterTest.java) | **PASS** |
| **F01-I02** | AC08 | Disposable Neo4j container stopped/unreachable | Call catalog adapter read method | Dependency failure is safely wrapped as `CATALOG_UNAVAILABLE`, never returning false empty or not-found results | [Neo4jTargetRoleCatalogAdapterTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/infrastructure/Neo4jTargetRoleCatalogAdapterTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd -Dtest=Neo4jTargetRoleCatalogAdapterTest test
# Result: PASS — 3 tests, 0 failures, 0 errors, 0 skips against disposable Neo4j Testcontainers instance
```
