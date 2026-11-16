# FR-02.01 / REQ-064: organization directory system evidence

## 2026-11-04 accepted local slice

**Result:** **3 Playwright journeys passed**, exit **0**, at desktop **1366 x 900** and mobile **375 x 812**. This verifies the read-only provisioned-organization slice, not all of FR-02.01. Organization profile editing and registrations without a provisioned workspace remain excluded.

Actual UI URL: `http://127.0.0.1:8092/platform-admin/organizations`; API health: `http://127.0.0.1:18084/actuator/health`. Tests used project `alg-organizations-20261104`, isolated project-prefixed PostgreSQL/Neo4j volumes, the test-only subscription runtime, loopback provider fixtures and Mailpit. No real payment/email operation, shared data reset, commit or deployment was performed. The task stack is stopped after verification; its test volumes are preserved.

## Reproduce

Prerequisites: Docker Desktop Linux engine, Java 21/Maven wrapper for backend tests, existing frontend dependencies, Node 22 and installed Chrome (or `PLAYWRIGHT_CHROME_PATH`). Verify that the dedicated project and loopback ports do not belong to another task. Never use `down -v`.

From repository root:

```powershell
docker compose -p alg-organizations-20261104 -f .\compose.dev.yml -f .\compose.subscription-test.yml -f .\compose.organizations-test.yml up --build -d --wait --wait-timeout 240 postgres neo4j mailpit api web
```

The repository organization override reproduces the session override used for this run. It removes unrelated catalog/development seed dependencies, runs existing Flyway migrations against its own database, uses normal empty Neo4j storage, and retains the existing test-image provider/fixture boundary. Compose process readiness alone is not web readiness: wait for Vite's ready message and verify HTTP 200 from `/api/v1/system/status` through port 8092 before testing. Backend health also returned HTTP 200.

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npm.cmd run test:system:f02 -- REQ-064-manage-organizations.spec.ts --output=test-results/REQ-064-20261104-r3
```

Actual final run: **3 passed / 0 failed / no retries**, exit **0**, **2.2 minutes**. New reruns should select a new output directory to preserve this history. Tests create unique synthetic fixtures and tolerate existing directory records; they do not erase retained test data.

## Acceptance mapping

| Acceptance | Procedure / actual observable outcome | Result |
| --- | --- | --- |
| AC-01/03/05 | Real platform sign-in, explicit organizations route, delayed real read, exact directory card count; controlled 503 visibly fails and Try again returns to real API data; no organization edit controls/textboxes | Passed |
| AC-01/02/07 | Active/expired/absent coverage fixtures use real stored organizations and current assigned administrators. Active purchased plan has two period timestamps; expired has null current; absent coverage has no plan or invented administrator; failed setup remains distinct from access status | Passed |
| AC-02 | Current profile name/email displayed, active and inactive assignments labeled; original registration contact is not substituted for the current role rule | Passed |
| AC-04 | Named dialog; Escape and Cancel leave access ACTIVE; confirmed suspension persists after reload; confirmed reactivation restores administrative access and preserves exact subscription projection and setup state | Passed |
| AC-04/07 | Expired organization's suspend/reactivate remains EXPIRED; reactivation creates no paid coverage | Passed |
| AC-05 | Desktop/mobile screenshot inspection, long UUID-bearing fixture names/emails wrap, no horizontal document overflow, keyboard Escape, settled dialogs before screenshots | Passed |
| AC-08 | Anonymous directory request 401, real organization administrator directory request 403 and foreign-organization suspension 403 | Passed |
| AC-05/08 | No page errors, unexpected failed requests or console errors during authenticated feature journeys | Passed |

Deterministic empty/null/loading/error/mutation-failure/pending-action presentation is additionally covered by [component/API tests](../unit/REQ-064-manage-organizations-20261104.md). The first fresh-database browser run also observed the real empty directory; final replay validates existing retained directory data rather than assuming a destructive reset. The controlled 503 is explicitly a browser error-state probe, not proof of persistence.

The positive active/expired fixtures use real order creation and payment application against the isolated database. NONE fixtures have no paid periods. Test-only fixture endpoints are compiled under `backend/src/test` and are not in the production application image. The primary browser journeys are not backed by intercepted successful business responses.

## Artifacts and inspected screenshots

Final artifacts: [desktop suspended](../../../frontend/test-results/REQ-064-20261104-r3/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organizations-suspended.png), [desktop reactivated](../../../frontend/test-results/REQ-064-20261104-r3/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organizations-reactivated.png), [mobile suspended](../../../frontend/test-results/REQ-064-20261104-r3/REQ-064-manage-organizatio-ef27b-ed-workspace-actions-375px--system-chrome/organizations-suspended.png), [mobile reactivated](../../../frontend/test-results/REQ-064-20261104-r3/REQ-064-manage-organizatio-ef27b-ed-workspace-actions-375px--system-chrome/organizations-reactivated.png). Desktop reactivated and mobile suspended were opened for visual inspection: card hierarchy, token-driven states, readable wrapped data and no obscuring dialog after settled mutations.

Browser console/network review is scoped after completed sign-in. Earlier trace inspection identified expected pre-sign-in `/workspace-auth/current` 401 responses and a pre-existing missing `/favicon.ico` 404; these are not directory feature errors and were not repaired as unrelated work. Deliberate negative API requests retain their explicit expected 401/403 assertions.

## Run history and fixes

| Run | Actual result | Diagnosis / action |
| --- | --- | --- |
| Readiness probe | Initial web request failed, backend health 200 | Web container was still executing its existing npm bootstrap. Inspected logs; Vite became ready and web/API HTTP returned 200. No service restart or data reset. |
| Initial browser run, `REQ-064-20261104` | Exit 1; 1 passed, 2 failed | Shared login helper lands at subscriptions. Added explicit navigation to organizations rather than change correct product entry behavior. |
| Second browser run, `REQ-064-20261104-r2` | Exit 1; 0 passed, 3 failed | Count included header language-switcher group; scoped to main. Inspected traces to identify expected login/bootstrap console messages. Added explicit dialog-close waits before settled screenshots; observed feature data/persistence assertions already succeeded. |
| Final browser run, `REQ-064-20261104-r3` | Exit 0; 3 passed | Exact route/scoping and settled mutations verified; no acceptance requirement weakened. |

Earlier failure screenshots/traces remain in their separate output directories. [Backend integration evidence](../integration/REQ-064-manage-organizations-20261104.md) records real persistence, audit, null-input rejection, CSRF, entitlement and regression checks.

## Manual checklist

These are repeatable follow-up steps; they do not assert a separate human acceptance run.

1. Start the isolated composition above. Confirm web/API HTTP 200 and open the actual organizations URL.
2. Use the existing test-only registrant helper with `platform=true` to create a fresh synthetic Platform Administrator; keep its returned test credentials local. Sign in, then navigate to organizations. No organization identity or browser-stored role establishes platform authority.
3. Use the isolated `/api/v1/__subscription-test/organization-directory?coverage=ACTIVE`, `EXPIRED` and `NONE` fixture POSTs to create unique local organizations; reload. Expect the purchased current plan/period only for ACTIVE; expired/none must not fabricate dates; current administrator assignments and inactivity labels must match stored data.
4. Confirm there are no profile edit inputs/actions. Check desktop and a 375px viewport: names/emails wrap, all status labels and action buttons remain visible, and the page has no horizontal overflow.
5. On the active organization, open Suspend. Verify the organization name and consequences; Escape/Cancel must leave it active. Confirm suspension, reload and verify Suspended while paid coverage remains unchanged.
6. Reactivate with confirmation, reload and verify administrative status ACTIVE with unchanged paid dates/setup. Repeat on EXPIRED; subscription must remain EXPIRED. Reactivating a failed-setup workspace must not mark setup READY.
7. Sign in separately as the active fixture's organization administrator. Its own workspace remains tenant-scoped; platform directory and another organization's suspension must be denied. Anonymous access must require authentication.
8. For failure/retry/pending-action behavior, run the focused component suite and controlled browser error probe above; do not corrupt a database or stop another task's service.
9. Stop only this dedicated project's services when finished; retain volumes. Do not copy fixture credentials into documentation or production configuration.

## Verdict

```text
environment:
  docker: AVAILABLE — 28.1.1, Linux engine reachable
  node: AVAILABLE — v22.15.0
  playwright: AVAILABLE — existing runner and installed Chrome used successfully
  infra-tier: PRIMARY — real PostgreSQL Testcontainers and isolated Docker Compose
  browser-tier: PRIMARY — Playwright, no capability fallback
startup: PASS — dedicated compose stack, backend and web/API HTTP 200
integration: PASS — exit_code: 0, passed: 36, failed: 0, skipped: 0
unit/architecture: PASS — exit_code: 0, passed: 21, failed: 0, skipped: 0
frontend: PASS — exit_code: 0, passed: 31, failed: 0
e2e: PASS — exit_code: 0, passed: 3, failed: 0
overall: PASS — approved local read-only slice only; no production certification
```

## 2026-11-13 platform layout restoration

**Final result: 4/4 real-API Playwright scenarios passed**, exit **0**, no retries, **3.6 minutes**. Local frontend presentation acceptance only; the wider FR-02.01 requirement and production readiness are not certified.

The selected reference was the earlier full Platform Administrator prototype (`e8ca78a7^`, `888cd27c`): sidebar/header, KPI cards, search/access filters and paginated table. The active route at that historical revision already used `SubscriptionShell`; this change restores the selected full platform composition without reviving its browser-store data, fabricated fields, profile editing or impersonation.

### Environment and reproduction

Windows, Node **22.15.0**, Docker daemon **28.1.1**, existing Playwright runner and installed Chrome. Actual URL: `http://127.0.0.1:8092/platform-admin/organizations`; real API on `18084`. A separate Compose project, `alg-platform-layout-20261113`, used its own PostgreSQL/Neo4j volumes, test-only organization fixture backend image `alg-organizations-test-backend:20261104`, Mailpit and the **current frontend source bind mount**. No shared development process or volume was replaced. No real payment/email provider was exercised.

The existing development stack on 8096 has no subscription-test fixture route (403); it was left unchanged. The organization composition inherited an unrelated knowledge-seed dependency that exited 1. Its databases/API were healthy, so only this project's web was started with `--no-deps`. Vite readiness and HTTP **200** from `/api/v1/system/status` through the web proxy were verified before browser execution.

```powershell
# Repository root; use available loopback ports and keep project volumes isolated.
docker compose -p alg-platform-layout-20261113 -f .\compose.dev.yml -f .\compose.subscription-test.yml -f .\compose.organizations-test.yml up --no-build -d --wait --wait-timeout 240 postgres neo4j mailpit api
docker compose -p alg-platform-layout-20261113 -f .\compose.dev.yml -f .\compose.subscription-test.yml -f .\compose.organizations-test.yml up --no-deps --no-build -d web
# Confirm web/API readiness, then from frontend:
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npm.cmd run test:system:f02 -- REQ-064-manage-organizations.spec.ts --output=test-results/REQ-064-layout-20261113-r3
```

The dedicated services were stopped after verification; volumes and test evidence were retained. Select a fresh output directory for another run. Backend unit/integration suites were not rerun because backend source/contracts were unchanged by this task; the cached real API was exercised through browser sessions, CSRF, persisted mutations and read-back.

### Acceptance and actual outcomes

| Layout criterion | Executed scenario / observable result | Result |
| --- | --- | --- |
| AC-01/04 | Delayed real directory read shows loading; controlled 503 is visible and retry restores real rows; table count is limited to 10 | Passed |
| AC-01 | API-derived global metrics, search by organization ID, no-match state, next page, filter resets page, All/Suspended filters and unchanged global metric values | Passed |
| AC-02 | Current administrator names/emails and assignment activity, purchased current period, expired/absent coverage and failed setup remain independent and explicit; no profile-edit fields/actions | Passed |
| AC-02 | Escape/Cancel do not mutate; confirmed suspend/reactivate persist after reload, preserve exact subscription projection and setup; expired coverage stays expired | Passed |
| AC-03 | 1366x900 and 375x812, visible platform navigation, no document horizontal overflow, actions accessible through table scrolling, final screenshots inspected | Passed |
| AC-02/04 | Anonymous API 401, organization-admin directory/foreign suspension 403; genuine platform identity shown in shared header; shared menu sign-out ends the real session (current identity 401) | Passed |
| AC-03/04 | EN/VI heading and search labels switch; no page errors, unexpected failed requests or feature-console errors in authenticated journeys | Passed |

Empty/null/error/pending-mutation edge cases and filtered-page clamping are also covered by the [34-test frontend regression receipt](../unit/REQ-064-manage-organizations-20261104.md#2026-11-13-platform-layout-restoration), not claimed as separate persistence tests.

Final screenshots: [desktop full directory](../../../frontend/test-results/REQ-064-layout-20261113-r3/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organizations-reactivated.png), [desktop suspended](../../../frontend/test-results/REQ-064-layout-20261113-r3/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organizations-suspended.png), [mobile suspended](../../../frontend/test-results/REQ-064-layout-20261113-r3/REQ-064-manage-organizatio-ef27b-ed-workspace-actions-375px--system-chrome/organizations-suspended.png), [mobile directory](../../../frontend/test-results/REQ-064-layout-20261113-r3/REQ-064-manage-organizatio-ef27b-ed-workspace-actions-375px--system-chrome/organizations-reactivated.png). Desktop full directory and mobile suspended were opened and visually inspected. Mobile intentionally scrolls the table horizontally, not the document.

### Run history and test adaptations

| Run | Result | Diagnosis / correction |
| --- | --- | --- |
| `REQ-064-layout-20261113` | 1 passed, 3 failed; exit 1 | Trace recorded successful mutation 200, but CSRF/mutation/refetch took longer than the old 5-second assertion; login polling also expired while UI completed authentication. Real API round trips measured about 1-3 seconds. Added a 15-second scoped assertion/login-poll budget and 180-second scenario budget, without dropping any business checks. |
| `REQ-064-layout-20261113-r2` | 3 passed, 1 failed; exit 1 | Both desktop/mobile persistence journeys passed. New metric comparison mixed CSS-transformed `innerText` with `textContent`; replaced it with exact KPI heading values derived from the real API, retaining the unchanged-count assertion after filtering. |
| `REQ-064-layout-20261113-r3` | 4 passed, 0 failed; exit 0 | All preserved and new flows passed, including EN/VI and real shared-menu logout. |

Existing browser tests were reused with presentation-dependent selectors changed from card groups to table rows, explicit search before locating fixtures across pagination, and a renamed page heading. Added one focused multi-step search/filter/pagination/identity flow; loading/retry and both persisted-action viewport journeys remain. The shared login helper only gained an explicit bounded authentication wait. Failure artifacts remain in their separate output directories.

### Manual checklist for the restored layout

1. Reproduce the isolated stack above, confirm HTTP 200 and use the existing test-only platform registrant helper; keep generated credentials local. Open the organizations URL.
2. Verify the trusted platform account, sidebar/header and four API-derived global KPI cards. No fabricated seats/domain/creation date or organization-edit/impersonation actions should appear.
3. Search by organization name/ID and administrator name/email. Verify no-match feedback, then clear. Filter Active/Suspended and return to All; global KPI totals must not shrink with the table.
4. With more than ten organizations, move to page two, search/filter and confirm the page resets. Suspend the final active item on a filtered last page; a valid remaining page must be shown.
5. At desktop and 375px mobile, inspect status/administrator/period text and scroll the table to reach actions. The document must not scroll horizontally; sidebar controls and dialogs remain reachable.
6. Repeat the original named Cancel/Escape, confirmed suspend/reactivate, reload/API read-back and wrong-role checks above. Paid coverage and setup must not change.
7. Switch EN/VI, then use the account menu to sign out. Protected data must require a new authenticated session.
8. Stop only the dedicated project's services; retain volumes. The checklist is a repeatable procedure, not a separate human acceptance claim.

```text
environment: Docker AVAILABLE (28.1.1); Node AVAILABLE (22.15.0); installed Chrome/Playwright AVAILABLE
startup: PASS; isolated real databases/API and current source web; proxy system status HTTP 200
frontend: PASS; exit_code 0; 34 passed, 0 failed; build/scoped lint passed
backend unit/integration: NOT RUN; no backend changes; no new backend-suite pass claimed
e2e: PASS; exit_code 0; 4 passed, 0 failed; real API/data, desktop/mobile, no retries
overall: PASS for approved local layout slice only
```

### 2026-11-13 login-home follow-up

Request: completing Platform Administrator login must open `/platform-admin/organizations`, not the previous subscription-plan page. The central role-home mapping was corrected; other roles, MFA/authentication and subscription navigation were not changed.

The existing real directory/search browser scenario now asserts the destination **immediately after `workspaceLogin`**, before any manual organization navigation. This removes the prior `page.goto` that concealed the incorrect login home. It verifies the Organizations heading, real API directory/KPI values, search/filter/pagination, language switching and actual shared-menu logout.

```powershell
# frontend; same isolated task-owned stack as the layout run above
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npm.cmd run test:system:f02 -- REQ-064-manage-organizations.spec.ts --grep 'Real directory search' --output=test-results/REQ-064-login-home-20261113
```

Actual result: **1 passed / 0 failed**, exit **0**, **2.2 minutes**, real fresh synthetic Platform Administrator login/CSRF/session/API, no intercepted successful responses. [Post-login screenshot](../../../frontend/test-results/REQ-064-login-home-20261113/REQ-064-manage-organizatio-333f2-rics-and-trusted-navigation-system-chrome/platform-login-organizations.png) was inspected: authorized platform header/sidebar and Organizations heading appear while the directory query loads; subsequent assertions verify loaded real data. The active development Docker module on 8096 also returned HTTP 200 with the new home mapping.

On restart, the test web initially closed the connection during its existing npm/Vite startup. A bounded readiness wait confirmed proxy system status HTTP 200 before the browser command ran. This was not a browser-test failure. Task-owned services were stopped afterward, volumes retained; the shared development stack was not restarted.

**Remaining gate:** full frontend build is **Blocked/Failed** by the unrelated guest registration test fixture described in the [unit receipt](../unit/REQ-064-manage-organizations-20261104.md#2026-11-13-login-home-follow-up). Passing redirect tests/runtime do not make that full build green. Backend tests were not rerun because backend contracts are unchanged.

Manual follow-up: open `/login`, authenticate as Platform Administrator and select Continue to workspace; expect `/platform-admin/organizations` and the restored platform layout without manually replacing the URL. Organization Administrator and other tenant-role entry destinations must remain unchanged.

### 2026-11-14 organization profile and System Administrator phone

Request: the Platform Administrator directory must show the organization profile captured by onboarding (V65) and the System Administrator phone, with a redesigned page UI. Approved scope: the table shows workspace URL (slug), industry, country and created date. "View details" opens a read-only dialog with ID, workspace URL, industry, company size, country and created date, plus all administrators and the subscription. Only the registrant administrator (`registration.account_id`) is flagged System Administrator and carries the phone; a missing phone displays "Not provided". Search additionally matches workspace URL and phone. The policies timestamp is not shown. No editing actions were added.

Environment: dedicated project `alg-org-details-20261114` (web 8092, api 18084) using `compose.dev.yml`, `compose.subscription-test.yml` and `compose.organizations-test.yml`, with the api image overridden to `alg-organizations-test-backend:20261114` built from current sources including test runtime classes. A clean `test-compile` at HEAD fails on 25 committed, unmodified catalog/question-bank/module-authoring test files unrelated to this feature, so the image was built from a temporary Dockerfile that deletes only those files before packaging. The directory fixture (`SubscriptionTestRuntime`) now stores industry, headcount, country and admin phone for ACTIVE/EXPIRED registrations. Web was started with `--no-deps`; proxy system status returned HTTP 200 before the run.

```powershell
# frontend
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npm.cmd run test:system:f02 -- REQ-064-manage-organizations.spec.ts --output=test-results/REQ-064-org-details-20261114-r2
```

New assertions: ACTIVE row shows `/workspace/…`, "Data & analytics · Vietnam", `+84901234567`, the System Administrator badge and three `time` elements (created date plus period); EXPIRED shows one (created date); NONE shows "Profile details not provided". The details dialog shows organization ID, industry, "21 - 50 employees", Vietnam, phone and administrator email, and closes; searching `84901234567` finds the row. Existing suspension/reactivation, authorization (401/403), search/filter/pagination and language checks are unchanged.

Run history: first run (`REQ-064-org-details-20261114`) 2 passed / 2 failed. Both desktop and mobile action scenarios failed only on the console-error assertion: React reported a `<div>` (Badge) nested inside the dialog's `<p>` description. The dialog header now uses a `<div>`. Rerun `-r2`: **4 passed / 0 failed**, exit **0**, 6.2 minutes, no retries, no intercepted successful responses.

Screenshots inspected: [desktop directory](../../../frontend/test-results/REQ-064-org-details-20261114-r2/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organizations-reactivated.png), [desktop details](../../../frontend/test-results/REQ-064-org-details-20261114-r2/REQ-064-manage-organizatio-49d8f-d-workspace-actions-1366px--system-chrome/organization-details.png), [mobile details](../../../frontend/test-results/REQ-064-org-details-20261114-r2/REQ-064-manage-organizatio-ef27b-ed-workspace-actions-375px--system-chrome/organization-details.png). At 375px the table scrolls inside its own region with no page-level horizontal overflow; the dialog body scrolls. The mobile full-page capture shows the fixed dialog offset — a full-page screenshot artifact, not a layout defect. Task services were stopped with volumes retained; the shared development stack was not restarted by this run.

```text
environment: Docker AVAILABLE; Node AVAILABLE; installed Chrome/Playwright AVAILABLE
startup: PASS; isolated real databases/API (current sources) and current source web; proxy system status HTTP 200
backend unit/integration: PASS; 15 passed, 0 failed (scoped; see unit receipt)
frontend: PASS; 15 passed, 0 failed; build passed; scoped lint passed
e2e: PASS; exit_code 0; 4 passed, 0 failed; real API/data, desktop/mobile, no retries
overall: PASS for the approved organization-profile/System Administrator phone slice only
```

Manual checklist:
1. Sign in as Platform Administrator; expect `/platform-admin/organizations`.
2. For an organization registered through onboarding, the row shows the workspace URL, industry · country, created date, and the System Administrator name, email, phone and badge.
3. For a registrant with no phone, the phone line shows "Not provided"; non-registrant administrators show no phone and appear as "+N more administrator(s)".
4. Search by part of a phone number or the workspace URL; the row remains.
5. Select "View details"; confirm profile fields, administrators and subscription. Close, then reopen and choose Suspend/Reactivate from the dialog footer; the named confirmation appears and Cancel leaves status unchanged.
6. Switch to VI: labels translate, company size shows "nhân viên", country name is localized.
7. At 375px, the page has no horizontal overflow and the dialog content scrolls.