# REQ-015 — Role Requirements Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Revalidate Expert competency/skill proficiency/importance, completion submission and L&D publication without requirement editing. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-015-F01 Link Micro-Skill to Target Role](../../features/Role%20requirements/Link%20Micro-Skill%20to%20Target%20Role.md)
- [REQ-015-F02 Unlink Micro-Skill from Target Role](../../features/Role%20requirements/Unlink%20Micro-Skill%20from%20Target%20Role.md)
- [REQ-015-F03 Set Required Proficiency](../../features/Role%20requirements/Set%20Required%20Proficiency.md)

**Level:** Unit (Domain Invariants, Application Services & Frontend Components)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-015-F01 AC01 | TargetRole entity with micro-skill requirements | Construct TargetRole with `skillTargets` | Validates and accepts requirement records; schema eliminates deprecated weight and mandatory flags per Schema V5 | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F02-U01** | REQ-015-F02 AC01 | TargetRole with linked micro-skills | Remove skill requirement item | In-memory entity correctly unlinks skill without mutating referenced micro-skill entity | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F03-U01** | REQ-015-F03 AC01 | TargetRole requirements with mastery float | Set requirement with `targetMastery = 0.85f` | Normalizes and validates float between `0.01` and `1.0`; rejects negative or zero mastery | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F03-FE01** | REQ-015-F03 AC02 | Authoring modal in `TargetRolesPage.tsx` | Slide proficiency threshold slider or type numeric input | Enforces bounds between `1%` and `100%`; updates target mastery payload | `frontend/src/features/manager/target-roles/TargetRolesPage.tsx` | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleDomainTest,TargetRoleServiceTest" test
# Result: PASS — All domain requirement validations verified

cd frontend; npm run build
# Result: PASS — Type-checks and builds cleanly with no UI errors
```
