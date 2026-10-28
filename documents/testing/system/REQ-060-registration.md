# REQ-060-F01-F03: Local browser evidence and live acceptance

## R1 onboarding refinement, 2026-10-26

**Passed: five registration Playwright scenarios, exit 0, zero skipped**, on the preserved registration-test stack at `http://127.0.0.1:8089`, SMTP capture `:8026`. Includes separated forms, exact nullable fields, desktop/mobile EN/VI, mandatory MFA/recovery, focused field errors, API restart and expired email/session handling. Current screenshots are under `frontend/test-results/onboarding-r1-registration-verified`.

The repeated subscription-stack run hit the real IP registration limit; limits were not weakened and counters/data were not reset. All five scenarios were rerun on the independently isolated existing registration stack. See [R1 environment, commands, run history and manual checklist](REQ-039-onboarding-billing-refinement.md). Historical live Gmail AC-09 below remains Blocked.

**Contract:** [Organization onboarding revision 12](../../features/Organization%20onboarding/README.md#implementation-brief-registration-first).  
**Date:** 2026-10-21. **State:** Local slice verified; **AC-09 Blocked** pending externally configured Gmail and assisted authenticator check. Overall feature is **not Complete**.

## Isolated environment

- Docker 28.1.1 / Compose 2.35.1, PostgreSQL 17.6, existing Neo4j, Spring Boot API and Vite.
- Compose project `adapt-learn-graph-registration-test`; [override](../../../compose.registration-test.yml). Independent volumes; existing development data was not reset.
- Registration: <http://127.0.0.1:8089/guest/register>; resume: <http://127.0.0.1:8089/guest/resume>.
- API: <http://127.0.0.1:18081>; Mailpit: <http://127.0.0.1:8026>.
- Chrome executable: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Synthetic `@example.test` accounts and isolated fixture keys only. Mailpit SMTP acceptance is not Gmail inbox delivery.

## Actual results

| Acceptance | Browser/system scenario | Result |
| --- | --- | --- |
| AC-01, AC-03, AC-04, AC-05, AC-06, AC-08 | Desktop 1440px: real registration, SMTP-captured email, mandatory MFA, exact saved fields, reload, password/TOTP resume, recovery in independent browser context and original-session revocation. | Passed. No unexpected page errors or failed requests in this flow. |
| AC-01, AC-06, AC-08 | Mobile 375px: generated slug, null optional fields, completed saved record, no workspace-entry link and no horizontal overflow. | Passed; heading is below sticky header, not obscured. |
| AC-08 | Loading/connection failure/retry and invalid reserved slug preserve inputs and focus actionable error summary. | Passed. Network failure is deliberately injected in this scenario. |
| AC-06 | Restart isolated API container, then reload existing full-session browser; entire current-registration response equals pre-restart response. | Passed; exact registration ID, fields, times, nulls and session survive restart. |
| AC-03, AC-06, AC-08 | Expire only the synthetic account's email proof and session timestamps in isolated PostgreSQL; show expired-code error, deny progress, then require sign-in and clear password after session expiry. | Passed in focused rerun. No runtime bypass or rate-bucket reset. |
| AC-07 | V8 migrations/startup, existing production boundaries, starter/worker profiles. | Passed; see [integration](../integration/REQ-060-registration.md) and [unit](../unit/REQ-060-registration.md). |
| AC-09 | Controlled Gmail inbox delivery, human authenticator enrollment and subsequent sign-in. | **Blocked: not run; credentials/configuration and assisted owner actions not yet confirmed.** |

Five distinct Playwright scenarios passed across the four-scenario suite and the focused expiry rerun. The [spec](../../../frontend/system-tests/REQ-060-registration.spec.ts) uses the real API/stores, not successful registration mocks.

## Commands

From repository root, disposable synthetic test keys only:

```powershell
$env:REGISTRATION_TEST_ENCRYPTION_KEY = [Convert]::ToBase64String([byte[]](1..32))
$env:REGISTRATION_TEST_HMAC_KEY = [Convert]::ToBase64String([byte[]](33..64))
docker compose -p adapt-learn-graph-registration-test -f compose.dev.yml -f compose.registration-test.yml up --build -d
```

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL = 'http://127.0.0.1:8089'
$env:REGISTRATION_TEST_INBOX_URL = 'http://127.0.0.1:8026'
$env:REGISTRATION_TEST_API_CONTAINER = 'adapt-learn-graph-registration-test-api-1'
npm.cmd run test:system:f02 -- REQ-060-registration.spec.ts
```

Restart/expiry scenarios are skipped unless the isolated container variable is set, and reject other container names. A skip does not satisfy those acceptance checks.

The final expiry-only rerun used `--grep=expired --output=test-results\registration-expiry` and `REGISTRATION_TEST_EXPIRY_EMAIL` pointing to the earlier failed synthetic `expiry-<uuid>@example.test` fixture. It signed in normally to the retained registration because repeated whole-suite runs had reached the legitimate ten-signup/hour test-proxy limit. Do not reset throttles to force a pass; wait for the window, or reuse that narrowly validated test fixture. It is not a live-account credential setting.

## Execution history and artifacts

1. Initial suite: 3 passed. Visual review found a wrapped mobile brand/header and obscured completion heading.
2. Added responsive registration-only header and explicit stage focus/scroll positioning. Component tests/build passed. First browser rerun saw stale Docker Vite modules and failed the new geometry assertion.
3. Confirmed served module lacked the edit; restarted only the isolated Vite container and verified current source was served. Three browser scenarios then passed with corrected screenshots.
4. An initially nested restart test was not discovered (two selector attempts reported no tests); moved it to top level. Four-scenario run: **4 passed in 43.6 seconds**, including real API restart.
5. Added expiry flow: business assertions passed, but an exact label selector omitted the required marker. Corrected selector; resumed existing fixture rather than weakening throttles. Focused rerun: **1 passed in 6.0 seconds**.
6. Profile regression subsequently exposed a database-free starter initialization failure; excluded registration from `starter`, reran 14 API/profile/boundary tests successfully, and rebuilt the isolated API without dropping volumes.
7. Final rebuilt API readiness returned HTTP 200. The retained-registration expiry browser scenario passed again (1/1, 6.6 seconds). Authenticated second-registrant/forged-selector assertions were added to the HTTP suite: 4/4 passed at 19:36 +07:00. New evidence links and scoped whitespace checks passed.

Desktop form/completion and mobile completion/validation PNGs are generated in [frontend/test-results](../../../frontend/test-results/), with named `registration-*.png` files under each scenario directory. The corrected screenshots were visually inspected. Test traces/video/automatic screenshots are disabled; explicit form screenshots mask passwords, setup/recovery sections are redacted on teardown, and inputs are cleared before failure snapshots. Do not retain unredacted live proofs, QR secrets or recovery codes.

The PostgreSQL source was regenerated from the isolated migrated catalog: 24 identity/catalog/processing + 23 assessment/learning + 13 pathway/analytics tables. PostgreSQL/runtime SVGs rendered locally with PlantUML 1.2025.10 and parsed as XML. No diagram source was sent to an external renderer.

## Manual acceptance and operational status

Follow [manual browser and Gmail checklist](REQ-060-registration-manual-check.md). Payment, provisioning, workspace entry, organization roles and production readiness are excluded. Do not mark AC-09 Passed from the Mailpit results or SMTP acceptance alone.

The user selected **defer-stop** on 2026-10-21: defer live Gmail and retain AC-09 as Blocked. At 20:10 +07:00, `docker compose ... stop` stopped only `adapt-learn-graph-registration-test`; verification found zero running project containers and both `adapt-learn-graph-registration-test_postgres_data` and `adapt-learn-graph-registration-test_neo4j_data` still present. No volumes were removed. The listed local URLs are unavailable until this stack is restarted.

Live configuration must use independently generated keys, a separate Compose project and a controlled inbox. No live Gmail stack, commit, push, deployment or payment was performed.

## Revision 13: Public landing (2026-10-21)

**Contract:** [Public landing and guest entry](../../features/Organization%20onboarding/README.md#public-landing-and-guest-entry-revision-13). **Result:** LP-01 through LP-05 Passed for the approved local frontend enhancement; revision 12's live Gmail AC-09 remains **Blocked**.

Environment: existing `adapt-learn-graph-dev` Compose stack, <http://127.0.0.1:8088/>, installed Chrome, Playwright 1.63.0. The dev web image and anonymous dependency volume were refreshed for Motion 14.5.0. Separate browser contexts were used; no registration submission, live email, account mutation, API restart or database reset was performed for this enhancement. The stopped registration-test stack and its volumes were left untouched.

| Acceptance | Scenario | Actual result |
| --- | --- | --- |
| LP-01, LP-02, LP-03, LP-05 | Desktop 1440x1000: `/`, `/home`, `/guest`; register/resume/sign-in navigation; real registration/resume forms; login without both guest links, preserving four demo-role controls; brand returns home. | Passed. No unexpected page errors or failed requests in this monitored scenario. |
| LP-02, LP-03 | Mobile 375x812: menu expanded state, Escape/focus restoration, section navigation, keyboard FAQ, unobscured focus, EN/VI content. Landscape 812x375: menu CTA remains reachable and opens registration. | Passed; no horizontal overflow at either viewport. |
| LP-03, LP-04 | Reduced motion, desktop: all reveal sections opacity 1 with no transform, four graph paths visible, keyboard skip link focuses main, dark-theme brand uses foreground. | Passed; final dark/light/mobile screenshots visually inspected. |
| LP-05 | Frontend tests/build/lint | Passed: [17 tests and build/lint evidence](../unit/REQ-060-registration.md#revision-13-public-landing-2026-10-21). |

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL = 'http://127.0.0.1:8088'
npm.cmd run test:system:f02 -- REQ-060-landing.spec.ts --output=test-results\landing-r13-final
```

The existing system runner name is retained; the selector runs only [REQ-060-landing.spec.ts](../../../frontend/system-tests/REQ-060-landing.spec.ts).

Execution history:

1. Initial suite: **3 passed in 20.8 seconds**, artifacts under `frontend/test-results/landing-r13`. All five initial PNGs were visually inspected; the header brand was unreadable because `text-card` collided with the surface-color utility in both themes.
2. Corrected only the landing brand's typography utility and added light/dark computed-foreground assertions. Fetching the served module confirmed Docker Vite was stale; restarted only dev `web` to serve the fix.
3. Final suite at 22:21 +07:00: **3 passed in 22.7 seconds**, zero skipped. Corrected desktop, English/Vietnamese mobile and dark/reduced-motion screenshots were inspected. The sign-in layout remained unchanged from the inspected first run.

Final local artifacts are in [frontend/test-results/landing-r13-final](../../../frontend/test-results/landing-r13-final/), under the per-scenario directories:

- `landing-desktop.png`: complete desktop composition.
- `enterprise-signin-no-guest-links.png`: sign-in without guest links; password masked.
- `landing-mobile.png`: English mobile and open FAQ.
- `landing-mobile-vi.png`: Vietnamese mobile.
- `landing-dark-reduced-motion.png`: dark theme with reduced motion.

These generated artifacts are local and reproducible, not committed fixtures. Trace/video/automatic screenshots are disabled. The page uses illustrative graph content, not fabricated learner data or a successful-registration mock. Motion's MCP was unavailable; official public installation/accessibility/lazy-motion documentation was used without uploading project source.

**Operational status:** Leave dev services running at port 8088 for review. See [manual landing checklist](REQ-060-registration-manual-check.md#e-public-landing-review-revision-13). Existing large-bundle and Vite/source-map-js dependency warnings are recorded at the unit tier; completing this landing does not certify production security, payment, provisioning or Gmail delivery.
