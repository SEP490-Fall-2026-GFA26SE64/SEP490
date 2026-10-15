# REQ-015 — Role Requirements System Testing Plan & Evidence

## Current Scope Alignment
Follow [current system criteria](README.md#current-scope-alignment). Revalidate Expert configuration/completion and L&D publication without editing competency requirements. Dates/counts below certify only their recorded contract.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-015-F01 Link Micro-Skill to Target Role](../../features/Role%20requirements/Link%20Micro-Skill%20to%20Target%20Role.md)
- [REQ-015-F02 Unlink Micro-Skill from Target Role](../../features/Role%20requirements/Unlink%20Micro-Skill%20from%20Target%20Role.md)
- [REQ-015-F03 Set Required Proficiency](../../features/Role%20requirements/Set%20Required%20Proficiency.md)

**Level:** System (Docker Compose Stack & UI Authoring Flow)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | REQ-015 Publication Gate | Complete Compose dev stack (`http://127.0.0.1:8088/expert/target-roles`) | Attempt to publish a draft role with 0 linked micro-skills | Action is blocked or disabled with validation tooltip / message requiring at least 1 benchmark micro-skill | Interactive UI Modal Check | **PASS** |
| **F01-S02** | REQ-015-F01 / F03 Full Flow | Complete Compose dev stack | Domain Expert adds micro-skills, adjusts proficiency slider to 85%, and clicks Save | Payload sent with `skillTargets`; Neo4j creates `[:REQUIRES_SKILL {targetMastery: 0.85}]`; UI table updates requirement badges | Compose E2E Flow | **PASS** |
| **F02-S01** | REQ-015-F02 Unlinking | Complete Compose dev stack | Click trash can icon next to a linked skill in the requirements table and save | Edge deleted from Neo4j; micro-skill remains available in global catalog | Compose E2E Flow | **PASS** |

---

## 2. Execution Evidence

- Authoring modal verified in frontend dev server / Compose stack.
- Dynamic proficiency slider maps UI range `[1%, 100%]` seamlessly to Neo4j float `[0.01, 1.0]`.
- Neo4j query `MATCH (r:TargetRole)-[req:REQUIRES_SKILL]->(s:MicroSkill) RETURN r.code, s.code, req.targetMastery` confirms edge creation in live Compose Neo4j.

---

## 3. Manual Browser Verification Procedure

See Section 4 ("Domain Expert Perspective & Queue Isolation") in:
- [REQ-023 Manual Browser Check](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05)
