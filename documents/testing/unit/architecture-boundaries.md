# Architecture & Boundary Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Existing architectural checks remain dated technical evidence; new authorization/storage ownership must follow approved architecture contracts. No application boundary changed in this docs-only task.

## Current Layered Architecture Checks (2026-11-01)

The backend was refactored from per-feature hexagonal packages to layer packages under `com.adaptlearngraph` (see [ARCHITECTURE.md](../../ARCHITECTURE.md#backend-structure)). [LayeredArchitectureTest](../../../backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java) replaces `HexagonalArchitectureTest`.

| Case ID | Rule | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| **LAYER-01** | Layered architecture | Controller layer (`apis`, `advice`, `endpoints`, `responseDto`, `model.dtos.file.response`) is used only by itself and infrastructure; `services` only by the controller, data and infrastructure layers; data layer (`repository`, `dtos`, `entities`) by every layer | **PASS** |
| **LAYER-02** | Entity independence | `entities` do not depend on `apis`, `services`, `repository`, `config`, Spring or JPA | **PASS** |
| **LAYER-03** | Data layer isolation | `repository`, `dtos` and `entities` do not depend on the controller layer | **PASS** |
| **LAYER-04** | Business layer isolation | `services` do not depend on the controller layer | **PASS** |

Evidence: [layered refactor run](layered-architecture-refactor-20261101.md).

## Historical Test Plan and Evidence

**Scope:** Architectural Integrity, Layer Decoupling & Framework Independence  
**Level:** Unit / Static Architecture Checks  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Boundary / Rule Tested | Scope | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ARCH-01** | Hexagonal Layer Decoupling | `domain` package across all modules | Domain entities and value objects do NOT depend on Spring, persistence, or adapters | [HexagonalArchitectureTest.java, replaced by LayeredArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java) | **PASS** |
| **ARCH-02** | Application Inversion | `application` package across modules | Application services depend only on domain and port interfaces, never on infrastructure adapters | [HexagonalArchitectureTest.java, replaced by LayeredArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java) | **PASS** |
| **ARCH-03** | Controller Isolation | `api` / controller packages | Controllers depend only on application ports/services; zero direct database adapter coupling | [HexagonalArchitectureTest.java, replaced by LayeredArchitectureTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java) | **PASS** |
| **SYS-01** | System Status Endpoint | Public HTTP endpoint `/api/v1/system/status` | Accessible without authentication; returns service health and info payload | `SystemStatusTest.java` | **PASS** |
| **SYS-02** | Worker Profile Decoupling | Non-HTTP worker execution mode | Worker runs independently without initializing web servlet containers | `WorkerProfileTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=HexagonalArchitectureTest,SystemStatusTest,WorkerProfileTest" test
# Result: PASS — 5 tests, 0 failures, 0 errors, 0 skips
```
