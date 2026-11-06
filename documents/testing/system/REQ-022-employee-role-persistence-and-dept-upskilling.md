# System Verification: Employee Target Role & Level Persistence and Department-Scoped Upskilling (`FR-03.01`, `FR-06.04`)

## Scope
- **`FR-03.01` (`REQ-022`):** Persist Employee Target Role & Level assignments in PostgreSQL (`platform.job_position_department_reference` and `platform.organization_membership`) and surface them in the Administrator User Accounts directory table, User Details modal, and Edit User modal.
- **`FR-06.04` (`REQ-048-F02`):** Filter the Employee Upskilling Target Role catalog (`/employee/upskilling?tab=roles`) to display only Published Target Roles (`status === 'published'`) belonging to the logged-in Employee's assigned Department and active Job Positions, while hydrating the Employee's active Target Role & Level banner (`CurrentRoleSummary`) with per-level estimated durations.

## Automated Verification Run (2026-11-06)
- **TypeScript Build:** `cd frontend && npx tsc -b` — **Passed** (0 errors).
- **Playwright E2E Spec:** `npx playwright test system-tests/REQ-022-employee-role-persistence-and-dept-upskilling.spec.ts --config=playwright.system.config.ts` — **Passed** (`1 passed (31.6s)`).
  - Verified Administrator selecting a department-scoped Published Target Role and Level for an Employee in **Edit User** and saving via `PUT /api/v1/organizations/{orgId}/subscription/members/{memberId}/profile`.
  - Verified clearing `localStorage`, reloading the page, and reopening **Edit User** and **View Details** retains the assigned Target Role & Level from PostgreSQL.
  - Verified switching to Employee and opening `/workspace/{slug}/employee/upskilling?tab=roles` displays the assigned Target Role & Level with per-level duration (`Est.`) and lists only Published Target Roles belonging to the Employee's Department (`ENG-CLOUD`), excluding roles from unrelated departments (`Security Analyst`, `Database Architect`).

