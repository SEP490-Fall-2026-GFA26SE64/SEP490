# Optional integrations: system evidence and manual checks

Date: 2026-10-30. Scope: FR-01.01/01.04/07.03 and subscription FR-01.03/07.02/07.04 (legacy REQ-060/061/028). Approved local/dev switch behavior, not production/live-provider acceptance.

## Feature-only clean-main retest

The approved switch changes were isolated on main `3302bda`, without unrelated catalog/workspace-routing edits or the reverted DEV-DEMO additions. The browser test uses main's existing `/admin/subscription` route.

The real API/web images were built and the fresh `adapt-learn-graph-integration-flags-clean-main` Compose project started with the same two Compose files shown below. This override disables development fixture seeding and requires only the completed workspace migration before API startup. PostgreSQL/Neo4j/API health passed. The first web readiness command exited 52 while npm performed its initial dependency installation; a subsequent bounded readiness check returned HTTP 200 without restarting the application.

From the isolated `frontend` directory:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8094'
node .\node_modules\@playwright\test\cli.js test --config=playwright.system.config.ts REQ-060-integration-flags.spec.ts
```

Final clean-main run: **2 passed / 0 failed / 0 skipped**, exit 0, approximately 1.2 minutes. Both complete journeys below passed at 1440x1000 and 390x844, including real persisted null proof/payment fields, denied anonymous/other-owner reads, workspace handoff, wrong-password rejection and reload. Unexpected console/page errors, non-aborted request failures and HTTP 5xx: **none**. There were no application API mocks.

The four new screenshots were inspected after current-period/seats and renewal readiness loaded. Historical screenshots were not overwritten:

- [Clean-main desktop receipt](assets/integration-flags-clean-main-20261030/development-bypass-1440.png)
- [Clean-main mobile receipt](assets/integration-flags-clean-main-20261030/development-bypass-390.png)
- [Clean-main desktop workspace](assets/integration-flags-clean-main-20261030/development-workspace-1440.png)
- [Clean-main mobile workspace](assets/integration-flags-clean-main-20261030/development-workspace-390.png)

The clean-main test containers/network were stopped with `down` without `-v`; `compose ps -q` then returned no containers. Its database volumes remain preserved. The shared development stack was not restarted.

```text
environment:
  docker: AVAILABLE — real Compose PostgreSQL, Neo4j, migration and healthy API
  node: AVAILABLE — Node 22
  playwright: AVAILABLE — installed Google Chrome, headless, one worker
  infra-tier: PRIMARY(Docker-based)
  browser-tier: PRIMARY(Playwright)
startup: PASS — API healthy and web HTTP 200 after initial dependency installation
integration: PASS — exit_code: 0, passed: 27, failed: 0, skipped: 0 (within 50 backend tests)
e2e: PASS — exit_code: 0, passed: 2, failed: 0, skipped: 0; real desktop/mobile journeys
overall: PASS — selected local/dev integration-switch scope only
```

Clean-main companion checks: **50 backend / 24 frontend** tests, typechecked build and scoped lint passed. Two unrelated callback-routing tests and one unrelated client test were excluded rather than imported with other uncommitted features. Fresh migration inventory is 36 workspace migrations ending at V37, not the combined-working-tree V1-V37 inventory. Live providers, production rollout and unrelated workflows remain unverified.

## Historical combined-working-tree environment and commands

Real Spring API, PostgreSQL, Neo4j and Vite proxy; no intercepted/mock application API responses. All three flags false, SMTP/payOS credentials empty, public test-only cryptographic keys. Windows, Node 22, installed Google Chrome, Playwright system configuration, one worker, no retries.

From the repository root:

```powershell
docker compose -f compose.dev.yml -f compose.integration-flags-test.yml build api
docker compose -p adapt-learn-graph-integration-flags-verified -f compose.dev.yml -f compose.integration-flags-test.yml up -d postgres neo4j migrate api web
```

After API health was UP and the web endpoint responded:

```powershell
Set-Location frontend
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8094'
npx playwright test --config=playwright.system.config.ts REQ-060-integration-flags.spec.ts
```

Final run: **2 passed / 0 failed / 0 skipped**, exit 0, approximately 1.3 minutes. Desktop 1440x1000 and mobile 390x844. These are two complete journeys, not additional tests for every assertion below.

| Actual verification at both widths | Result |
| --- | --- |
| Register through the UI without SMTP, email proof or MFA enrollment; reload COMPLETE registration with null actual email verification time | Passed |
| Select Starter, confirm terms, wait for the real create-order response and render development-bypass receipt | Passed |
| Persist DEV_BYPASSED with null received amount, confirmation time and checkout URL; no payOS checkout link | Passed |
| Unauthenticated order read 401; separate registered owner cannot read the order (403) | Passed |
| Reload receipt, enter the real provisioned workspace and verify actual session `mfaVerified=false` | Passed |
| Load current period/seats/history; renewal becomes available after queries complete, without treating bypass as an unresolved payment | Passed |
| Leave the mounted app before API logout; wrong password remains 401; correct password restores the session; reload canonical workspace route | Passed |
| Unexpected console/page exceptions, non-aborted failed requests and HTTP 5xx | None |

Expected anonymous-current HTTP 401 responses are explicitly distinguished from unexpected console errors. A separate diagnostic identified the existing missing `/favicon.ico` request (404); only that exact asset/status is excluded. It is not a new integration failure and was not repaired in this slice. Security negatives above use actual API responses, not a blanket 4xx exclusion.

## Visual evidence

Final screenshots were inspected after content and renewal eligibility loaded. Explicit screenshots contain only post-registration receipt/workspace data; automatic failure screenshots/traces are disabled for this spec so signup passwords are not captured.

- [Desktop bypass receipt](assets/integration-flags-20261030/development-bypass-1440.png)
- [Mobile bypass receipt](assets/integration-flags-20261030/development-bypass-390.png)
- [Desktop workspace](assets/integration-flags-20261030/development-workspace-1440.png)
- [Mobile workspace](assets/integration-flags-20261030/development-workspace-390.png)

Receipt visibly states not paid/no payment received; subscription periods no longer imply verified payment. Existing token-based cards/layout are retained. The mobile payment-history table remains internally horizontally scrollable, not redesigned.

## Earlier attempts and corrections

| Attempt / observation | Disposition |
| --- | --- |
| First real browser run rejected COMPLETE with a null email proof | Fixed the client parser's contradictory non-null requirement; added focused client regression. Actual proof was not fabricated. |
| Mobile passed while desktop timed out awaiting order rendering | Synchronized on actual registration/order responses; no blind sleeps or production timeout changes. |
| First screenshots captured workspace loading | Added content/current-period/renewal-readiness assertions before capture. |
| Intermediate two-viewport runs passed before stricter console checks | Historical, not added to final counts. |
| Immediate post-rebuild health probe returned curl 52 | Logs showed normal startup; health later UP. No speculative relaunch or failure claim. |
| Repeated fixture signup hit the existing 10-per-source-address/hour limit (429) | Limit retained. Stopped the isolated stack without removing volumes; distinct Compose projects supplied fresh, independent test data. |
| Stricter console check surfaced favicon 404; another run surfaced a mounted-page query during API logout | Diagnosed the exact unrelated asset; isolated API auth operations from the mounted app instead of broadly suppressing 401s. |
| Navigating to about:blank exposed the test's unconditional localStorage init | Restricted test language initialization to the test origin. Final two-viewport rerun passed. |

The read-only console diagnostic itself reached a network-idle navigation timeout after identifying the favicon; it is not counted as a passing journey. No rate-limit tables or preserved data were cleared.

## Manual checklist

These are repeatable procedures; an additional human walkthrough was **Not run**. Automated equivalents are identified above; mixed-policy/reenabling coverage is in the [unit/API](../unit/REQ-060-061-028-integration-flags-20261030.md) and [real-persistence](../integration/REQ-060-061-028-integration-flags-20261030.md) receipts.

1. Use only a local/dev test stack, private stable encryption/HMAC keys and fresh unique organization/email inputs. Open `http://127.0.0.1:8094/guest/register`; do not reuse production data or share test credentials.
2. With all three flags false, create the administrator, select a plan and continue. Expect skipped verification, explicit development-bypass receipt, no checkout/payment claim and actual workspace access after provisioning.
3. Reload receipt/workspace at desktop and mobile widths. Expect persisted selected terms, seats and not-paid history; verify the mobile table can scroll. Wrong-password and other-owner reads must remain denied.
4. Independently enable email or MFA and recreate the API. Expect only that missing step to become mandatory; resume/request a fresh email code where applicable. Existing bypass sessions must not claim missing real assurance. Use approved test email handling, not a real mailbox operation without authorization.
5. Reenable payOS for ordinary checkout only with separately approved test/provider configuration. Do not make a real payment as part of this checklist. Production or mixed local/production profiles with any false flag must reject startup; automated configuration checks cover that guard without deploying production.
6. Respect HTTP 429/retry windows. Stop the test stack with `down` without `-v`. Never delete preserved volumes to rerun verification.

## Cleanup and limits

All isolated test containers/networks were stopped with `down` without `-v`, including the final `adapt-learn-graph-integration-flags-verified` project; its absence from running containers was checked. Database volumes for the test/final/acceptance/verified projects remain preserved. The ordinary shared 8088/18080 development stack and private environment were not changed/restarted.

Final companion checks: **52 backend tests** (including 27 real database/API checks), **25 frontend tests**, typechecked build and scoped lint passed. No live payOS payment, mailbox delivery, production rollout, unrelated learning/catalog acceptance or manual EN/VI walkthrough is claimed.
