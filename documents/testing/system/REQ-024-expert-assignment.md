# REQ-024 — Expert Assignment System Testing Plan & Evidence

## Current Scope Alignment
Follow [current system criteria](README.md#current-scope-alignment). Revalidate L&D role assignment/removal separately from discipline assignment workflows. Dates/counts below certify only their recorded contract.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-024-F01 Assign Target Role to Expert](../../features/Role%20catalog/README.md#req-024-f01)
- [REQ-024-F02 Reassign Target Role Expert](../../features/Role%20catalog/README.md#req-024-f02)

**Level:** System (Docker Compose Stack & UI Combobox Workflow)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | REQ-024-F01 Combobox Selection | Complete Compose dev stack (`http://127.0.0.1:8088/ld-manager/target-roles`) | Open Create or Edit Target Role modal dialog in L&D Manager workspace | Searchable Combobox lists all `ELIGIBLE_EXPERTS` with name and title; selection saves and renders assigned expert badge in table | Interactive UI Modal Check | **PASS** |
| **F02-S01** | REQ-024-F02 Authority Shift | Complete Compose dev stack | L&D Manager reassigns role from `expert-chen` to `expert-rivera` | Role disappears from `expert-chen`'s workspace queue and appears in `expert-rivera`'s workspace queue; previous expert gets 403 Forbidden on update attempt | Multi-persona UI & API Check | **PASS** |

---

## 2. Execution Evidence

- Verified against live Compose deployment (`compose.dev.yml`).
- Combobox populated with eligible experts.
- Verified that assigning an expert populates `assignedExpertId` in both HTTP JSON payloads and Neo4j node attributes.

---

## 3. Manual Browser Verification Procedure

See Section 2 ("L&D Manager Workflow: Assigning & Reassigning Experts") in:
- [REQ-023 Manual Browser Check](REQ-023-manual-browser-check.md#2-ld-manager-workflow-assigning--reassigning-experts-req-024)
