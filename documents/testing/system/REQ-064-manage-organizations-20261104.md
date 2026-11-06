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
