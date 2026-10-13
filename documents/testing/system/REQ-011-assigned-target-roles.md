# REQ-011 — Assigned Target Roles System Testing Plan & Evidence

**Feature Contract:** [REQ-011-F01 View Assigned Target Roles](../../features/Assigned%20target%20roles/View%20Assigned%20Target%20Roles.md)  
**Level:** System (Docker Compose Stack & UI Workspace Persona Isolation)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | REQ-011-F01 Persona Isolation | Complete Compose dev stack (`http://127.0.0.1:8088/expert/target-roles`) | Switch Domain Expert persona combobox in header between `expert-chen` and `expert-rivera` | Chen sees `ROLE-AI-ARCH` and `ROLE-DATA-ENG`; Rivera sees `ROLE-MLOPS-02`; roles assigned to others are completely hidden | Manual Browser & Compose Network Inspection | **PASS** |
| **F01-S02** | REQ-011-F01 Read-Only Locking | Domain Expert authoring workspace | Inspect role code, title, and track inputs in Domain Expert view | Inputs are read-only / locked; Domain Expert cannot alter L&D Manager governance fields | UI Component Inspection | **PASS** |
| **F01-S03** | REQ-011-F01 View Details Visibility by Status | Domain Expert catalog (`/expert/target-roles`) | Inspect action buttons for roles in `SENT`, `PUBLISHED`, and `REJECTED` status | When status is `SENT` or `DRAFT`, "View Role Details" button is hidden; when status is `PUBLISHED` or `REJECTED`, "View Role Details" (`Eye` button with tooltip "View Role Details") is displayed cleanly without duplicate skill targets buttons | UI Component & Browser Inspection | **PASS** |
| **F01-S04** | REQ-011-F01 SENT Status Preservation | Dispatched target role (`status: SENT`) | Domain Expert adds or removes micro-skill benchmark threshold | Target role preserves `SENT` status (does NOT revert to `DRAFT`); L&D Manager screen maintains `SENT` badge until expert publishes or rejects | REST API & Live UI Inspection | **PASS** |

---

## 2. Execution Evidence

- Verified against live Compose deployment (`compose.dev.yml`).
- Persona switcher successfully injects `X-User-Id` header across HTTP requests.
- Cypher queries executed by the backend enforce tenant and expert isolation in the live Neo4j instance.
- Verified `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` from Domain Expert preserves `status: SENT` when adding skill targets.
- Verified `GET /api/v1/organizations/{orgId}/target-roles` returns `status: SENT` for L&D Managers and experts.

---

## 3. Manual Browser Verification Procedure

See Section 4 ("Domain Expert Perspective & Queue Isolation") in:
- [REQ-023 Manual Browser Check](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05)
