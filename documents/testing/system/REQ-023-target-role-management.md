# REQ-023 — Target Role Management System Testing Plan & Evidence

**Feature Contracts:**
- [REQ-023-F01 Create Target Role](../../features/Target%20role%20management/Create%20Target%20Role.md)
- [REQ-023-F02 View Organization Target Roles](../../features/Target%20role%20management/View%20Organization%20Target%20Roles.md)
- [REQ-023-F03 Update Target Role](../../features/Target%20role%20management/Update%20Target%20Role.md)
- [REQ-023-F04 Delete Target Role](../../features/Target%20role%20management/Delete%20Target%20Role.md)
- [REQ-023-F05 Expert Assigned Roles & Isolation](../../features/Target%20role%20management/Expert%20Assigned%20Target%20Roles.md)

**Level:** System (Docker Compose Stack, API Gateway, Real Postgres/Neo4j & UI Workflows)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | Full Role Lifecycle | Compose dev stack (`compose.dev.yml`) | L&D Manager creates role (`ROLE-CLOUD-ARCH`), assigns expert, expert sets micro-skills and publishes, manager creates successor draft v1.1 | All state transitions (`DRAFT` &rarr; `UNDER_REVIEW` &rarr; `PUBLISHED`) succeed; live Neo4j graph stores all architectural fields; PostgreSQL remains untouched by catalog data | Full-stack Compose flow | **PASS** |
| **F02-S01** | UI Table & Filters | Compose dev stack (`http://127.0.0.1:8088/ld-manager/target-roles`) | Filter table by Track (`MANAGEMENT`), Domain (`DATA_AI`), and search keyword | Results filter dynamically; KPI StatCards reflect actual counts; responsive density preserved | Manual Browser Smoke | **PASS** |
| **F04-S01** | Role Deletion | Compose dev stack | Click delete button on a draft target role and confirm deletion modal | Role removed from Neo4j graph (`DETACH DELETE`); toast displays success notification; table updates immediately | Manual Browser Smoke | **PASS** |

---

## 2. Execution Evidence

- Docker Compose dev stack started with `compose.dev.yml`.
- All backend unit and integration tests passed (72 tests).
- Frontend production build passed cleanly (`npm run build`).
- End-to-end role creation, editing, status lifecycle, and deletion verified via manual browser sessions and REST requests.

---

## 3. Manual Browser Verification Procedure

The step-by-step interactive manual verification checklist is maintained at:
- [REQ-023 Manual Browser Check](REQ-023-manual-browser-check.md)
