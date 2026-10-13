# Hexagonal Architecture & Boundary Unit Testing Plan & Evidence

**Scope:** Architectural Integrity, Layer Decoupling & Framework Independence  
**Level:** Unit / Static Architecture Checks  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Boundary / Rule Tested | Scope | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ARCH-01** | Hexagonal Layer Decoupling | `domain` package across all modules | Domain entities and value objects do NOT depend on Spring, persistence, or adapters | [HexagonalArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/HexagonalArchitectureTest.java) | **PASS** |
| **ARCH-02** | Application Inversion | `application` package across modules | Application services depend only on domain and port interfaces, never on infrastructure adapters | [HexagonalArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/HexagonalArchitectureTest.java) | **PASS** |
| **ARCH-03** | Controller Isolation | `api` / controller packages | Controllers depend only on application ports/services; zero direct database adapter coupling | [HexagonalArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/HexagonalArchitectureTest.java) | **PASS** |
| **SYS-01** | System Status Endpoint | Public HTTP endpoint `/api/v1/system/status` | Accessible without authentication; returns service health and info payload | `SystemStatusTest.java` | **PASS** |
| **SYS-02** | Worker Profile Decoupling | Non-HTTP worker execution mode | Worker runs independently without initializing web servlet containers | `WorkerProfileTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=HexagonalArchitectureTest,SystemStatusTest,WorkerProfileTest" test
# Result: PASS — 5 tests, 0 failures, 0 errors, 0 skips
```
