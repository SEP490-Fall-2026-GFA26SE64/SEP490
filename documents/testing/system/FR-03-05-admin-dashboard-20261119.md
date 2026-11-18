# FR-03.05 Organization Administrator dashboard — evidence (2026-11-19)

**Scope:** local/demo slice. The prototype "System Console" (mock audit log and browser-only configuration form) at `/admin/dashboard` was replaced by a real-data **Dashboard** built only on existing APIs. The organization-scoped audit feed is deferred and is not covered here.

**Stack:** Compose project `adapt-learn-graph-kgtest` (web `http://127.0.0.1:8088`, API `18080`), TechNova seed data (12 members, 10/200 employee seats, Enterprise Plan, 5 departments, 5 job positions, 48 target roles).

## Unit / component (Vitest)

**Command:** `cd frontend; npm test -- src/features/administration/dashboard src/shared/layouts`

| ID | Scenario | Result |
| --- | --- | --- |
| U-01 | `adminDashboardMetrics.test.ts`: active-member and role counts, seat warning at ≥ 90 % and critical when full, subscription warning at ≤ 14 days without a scheduled period, critical when expired/non-ACTIVE/missing, action items, department distribution, ACTIVE/PUBLISHED target-role count | Passed |
| U-02 | `AdminDashboardPage.test.tsx`: KPIs and action items from API responses, 90 % seat warning banner, per-card error with Retry, Employee denied by the workspace boundary | Passed |
| U-03 | `WorkspaceLayout` tests after renaming the tab to Dashboard | Passed |

Total: 3 files, 20 tests passed.

## Static checks

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npx oxlint src/features/administration/dashboard system-tests/ADMIN-dashboard.spec.ts src/shared/i18n` | Passed for the changed files (only pre-existing `only-export-components` warnings in `LanguageContext.tsx`) |
| Typecheck | `npx tsc -b` | Failed outside this slice: errors only in `usePathwayAssessmentStates.ts`, `roleOverviewData.ts` and `GuestRegisterPage.tsx` (concurrent uncommitted changes, not touched here). No errors in the dashboard files. |

## System / browser (Playwright, Chrome)

**Command:** `cd frontend; npm run test:system:f02 -- ADMIN-dashboard`
**Spec:** `frontend/system-tests/ADMIN-dashboard.spec.ts` — **3/3 Passed**

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| S-01 | Desktop 1440×900, `admin@technova.com` clicks the **Dashboard** tab | Six org-scoped GETs (subscription, members, activations, departments, job positions, target roles) return 200; heading "Dashboard", no "System Console"; active/total members, seats, plan name, published target roles, pending invitations, department and job-position counts equal the API responses; action link opens `/admin/users`; no HTTP ≥ 400, console or page errors | Passed |
| S-02 | Mobile 390×844, full reload of `/admin/dashboard` | Every card loads real data; no horizontal overflow; no HTTP ≥ 400, console or page errors | Passed |
| S-03 | `employee@technova.com` opens `/admin/dashboard` | "Your authenticated role cannot enter this workspace."; no dashboard cards | Passed |

**Artifacts (inspected):** `frontend/test-results/ADMIN-dashboard/desktop.png`, `mobile.png`, `employee-denied.png`.

**Run history:** an earlier S-02 run timed out on a full reload because the Vite dev server re-served source modules for ~40 s; request logging confirmed all dashboard APIs are sent and return 200 afterwards. The spec now allows 60–90 s for that step and waits for every card before the screenshot. No application change was needed.

**Unrelated failure observed:** `REQ-001-002-header-responsive.spec.ts` fails because `/api/v1/local-baseline-demo/session` returns 403 on this stack; it does not exercise the dashboard.

**Limits:** English UI asserted in the browser; Vietnamese copy is not asserted. Thresholds were checked at unit level, not with seeded near-full or expiring subscriptions. Not production acceptance.

## Manual test checklist

Prerequisite: stack running; sign in as an Organization Administrator (e.g. `admin@technova.com`); open **Dashboard** in the sidebar (`/workspace/{slug}/admin/dashboard`).

1. The page title is "Dashboard" with an **Invite users** button; there is no mock audit log or configuration form.
2. KPI cards show active members (with inactive/total), employee seats used/purchased with percentage, subscription plan with days remaining and end date, and published target roles with total.
3. **Needs attention** lists pending, failed and expired invitations and employees missing a department, job position or target role; each row links to User accounts.
4. **Members by role** shows counts for Administrators, L&D Managers, Experts and Employees (active memberships only).
5. **Organization structure** shows department and job-position counts and member distribution per department.
6. **Quick links** open User accounts, Departments, Subscription and Knowledge graph.
7. When seats are ≥ 90 % used or the subscription ends within 14 days without a scheduled renewal, a warning banner appears; when seats are full or the subscription is expired/inactive/missing, a critical banner appears. Banners never block actions.
8. Stop the API or force a request failure → the affected card shows an error with **Retry** while other cards keep working.
9. Switch the language to VI → labels are Vietnamese and the sidebar tab reads "Bảng điều khiển".
10. Sign in as an Employee and open `/admin/dashboard` → access is denied.
