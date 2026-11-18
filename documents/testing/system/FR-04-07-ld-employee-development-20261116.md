# FR-04.07 Monitor employee development — system/browser evidence (2026-11-16)

**Stack:** isolated Compose project `alg-fr0407` from `compose.dev.yml` with fresh volumes (the existing `adapt-learn-graph-dev` volumes were left untouched: their Flyway history reports a pre-existing V64/V65 checksum mismatch and was not repaired). Ports: web `http://127.0.0.1:28088`, API `28080`, PostgreSQL `25432`, Neo4j `27474/27687`. `MINIO_IMAGE=localtest/adapt-learn-graph-minio:RELEASE.2025-04-22T22-12-26Z` (public tag not pullable offline).

**Command:** `cd frontend; $env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:28088'; npx playwright test --config=playwright.system.config.ts FR-04-07-ld-employee-development`

**Actors:** public development fixtures from [DEV-DEMO.md](../../../DEV-DEMO.md) — `ld@workspace.dev.invalid` (L&D Manager), `employee@workspace.dev.invalid` (Employee). Organization: workspace-development.

## Results — 5/5 Passed (Chrome, 3.6 min)

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| S-01 | Employee selects a real target role/level via `PUT /api/v1/employee/target-role-selection` | Selection stored | Passed |
| S-02 | Employee calls `GET /api/v1/ld/development/employees` | 403 | Passed |
| S-03 | L&D Dashboard: sidebar shows Dashboard (active) + Employees, no Team Matrix; KPIs equal API headcount; charts render; no tables; chart segment opens filtered employee list; no console errors | As expected | Passed |
| S-04 | Employees list: legacy `/ld-manager/team-matrix` redirects; rows = API count; search empty state + reset; department URL filter count equals API; row → detail; competency profile shown when the API has competency data; all detail tabs open; back link returns; random account → 404; no failed report calls, no console errors | As expected | Passed |
| S-05 | Mobile 390×844: list renders as stacked cards; detail tabs scroll horizontally; dashboard stacks | As expected | Passed |

**Artifacts (inspected):** `frontend/test-results/FR-04-07/` — `dashboard-desktop.png`, `employees-desktop.png`, `detail-competency.png`, `detail-skill-gaps.png`, `detail-learning-pathway.png`, `detail-assessment-outcomes.png`, `detail-achievements.png`, `employees-mobile.png`, `detail-mobile.png`, `dashboard-mobile.png`.

**Observed latency (warm):** list ≈0.5–0.9 s, detail ≈0.6–1.9 s, comparable to existing `/ld/` and member endpoints on the same stack.

**Limits:** the fresh fixture has no approved pathway, finalized assessment or official evidence, so the browser run shows explicit empty/unavailable states for those sections; their populated rendering is covered by component test F-06 ([unit evidence](../unit/FR-04-07-ld-employee-development-20261116.md)). Vietnamese copy was not browser-checked. Not production acceptance.

## Manual test checklist

Prerequisite: stack running (above), browser at `http://127.0.0.1:28088/login`.

1. Sign in as `ld@workspace.dev.invalid` → open **Dashboard** in the left sidebar. Expect KPI cards and charts only (status donut, department summary, assessment outcomes, timeline, target roles, job-position readiness, learning activity).
2. Choose a department and a job position in the filter bar → KPI numbers and charts update; job position options narrow to the department.
3. Click a donut segment or a department card → **Employees** opens with the same filters in the URL.
4. On **Employees**: search by name/email/target role; toggle status chips; sort by progress/outcomes; paginate (10 per page).
5. Click a row → detail shows profile hero, target strip, KPI cards and tabs: Competency profile, Skill gaps, Learning pathway (read-only graph, no Learn/assessment buttons), Assessment outcomes (expand an attempt for per-skill scores), Achievements.
6. Use **Back to employees** → previous filters are kept.
7. Sign in as `employee@workspace.dev.invalid` and open `/api/v1/ld/development/employees` → 403.
8. Switch language to VI → labels switch to Vietnamese.
