# REQ-002 Workspace Baseline - Browser and Manual Evidence

Date: 2026-10-28. Real-session integration, scoped to local development.

## Executed scenarios

| Scenario | Environment / command | Result |
| --- | --- | --- |
| Manager configuration -> Employee role selection -> real attempt/answers -> stored result/mastery -> reload | Playwright `REQ-002-workspace-baseline.spec.ts`, isolated stack `http://127.0.0.1:8093` | Passed in the verified two-scenario run, exit 0. PostgreSQL/Neo4j data and session APIs are real; catalog/questions/model inputs are explicitly synthetic fixtures. |
| Wrong role, cross-organization result/config access, missing CSRF, unready bank/model, same-browser account switching | Same spec, two separate organizations | Passed in the verified two-scenario run. Unready attempts are rejected and history stays empty; no previous tenant role leaks into the next identity. |
| Existing login/activation/layout/email regressions | Playwright `REQ-037-single-role-activation.spec.ts` against the isolated identity stack | Passed, exit 0: five tests. Platform Admin password-only sign-in; Expert/L&D/Employee activation and role layouts; captured local transactional email. |
| Actual dev startup | `docker compose -f compose.dev.yml up -d --wait --no-build migrate api web`; GET `http://127.0.0.1:18080/actuator/health` | Passed: API/PostgreSQL/Neo4j healthy; web running at `http://127.0.0.1:8088`; health returns `UP`. |
| Actual dev sign-in/read/reload/sign-out | Headless Playwright using privately configured existing Platform Admin credentials, never printed | Passed: sign-in, plans API 200, baseline role access 403, reload, completed logout/current-session 401, zero browser exceptions. |

Browser executions inspect desktop and 390px mobile layout, capture screenshots and assert no page errors or unexpected failed requests. The final responsive follow-up adds an explicit assertion that page tabs start below the header, as well as no horizontal document overflow.

Final responsive follow-up: **Passed, exit 0, 2/2 scenarios (2.5 minutes)**. Screenshots were inspected and retained: [persisted mastery](artifacts/REQ-002-workspace-baseline/authenticated-baseline-result.png) and [mobile readiness without header overlap](artifacts/REQ-002-workspace-baseline/baseline-readiness-mobile.png). The isolated test stack was stopped afterwards; its volumes were preserved. The actual dev stack remains running.

## Earlier failed/blocked executions

- An old isolated `node_modules` volume lacked newly integrated `xlsx`; `npm ci` in that test container corrected it.
- A two-organization setup exceeded Playwright's default 30-second hook limit. The fixture hook now has an explicit bounded 180-second setup budget.
- Synthetic calibration fixture ordering was corrected to complete calibration while its output is a candidate, then promote it.
- Browser execution found and verified fixes for the shared transaction manager and real-membership result lookup.
- Some page assertions expired at 5 seconds while still showing legitimate loading under concurrent builds. Readiness assertions now have a bounded 15-second budget; failures were retained, not silently ignored.
- A disk-space error and unresponsive Docker blocked an earlier run. The user restarted Docker; no shared cache prune or database reset was performed.
- Screenshot inspection found a mobile header overlap caused by missing markup hooks from the merge. The hooks and a measurable non-overlap assertion were added.

These earlier executions remain failures/blocked runs; they do not count toward passing totals. This evidence does not certify live SMTP/payOS, real-content review, actual model calibration or production.

## Reproduction

From the repository root, use the existing isolated identity stack:

```powershell
docker compose -f compose.dev.yml -f compose.subscription-test.yml -f compose.identity-test.yml up -d --build --wait
docker exec adapt-learn-graph-identity-test-web-1 npm ci --ignore-scripts --no-audit --no-fund
```

From frontend:

```powershell
$env:SYSTEM_TEST_BASE_URL = 'http://127.0.0.1:8093'
$env:REGISTRATION_TEST_INBOX_URL = 'http://127.0.0.1:8030'
npx playwright test --config=playwright.system.config.ts REQ-002-workspace-baseline.spec.ts REQ-037-single-role-activation.spec.ts
```

The baseline spec refuses other base URLs. Its fixture controller is test-source-only, packaged in the isolated test image, not the dev application JAR.

## Manual checklist

Prerequisites: Docker Desktop running; preserved dev stack started; valid existing accounts/active organization membership and entitlement. Configure credentials outside chat. Dev has no automatically seeded approved bank/model.

1. Open `http://127.0.0.1:8088/login`, sign in and enter the assigned workspace. Expect the current actor layout and access restrictions, not a demo persona switch.
2. As L&D Manager, open `http://127.0.0.1:8088/ld-manager/baseline-assessments`. Without valid resource bindings, expect an explicit readiness message; no invented assessment or publication.
3. As Employee, open `http://127.0.0.1:8088/employee/upskilling?tab=roles`. Expect only authorized organization roles. With no ready catalog, expect the empty/readiness state. A historical incompatible selection must not silently change.
4. For a separately authorized, ready organization, select a role, start/resume its baseline, submit answers and reload `http://127.0.0.1:8088/employee/my-mastery`. Expect persisted own results, not a browser-only success toast.
5. Sign out and sign in to another organization in the same browser. Expect no previous role/result cache. Wrong-role and cross-organization API requests must be denied.
6. At 390px viewport, check header controls/tabs do not overlap and the page does not scroll horizontally.
7. GET `http://127.0.0.1:18080/actuator/health`; expect `{"status":"UP"}`.
