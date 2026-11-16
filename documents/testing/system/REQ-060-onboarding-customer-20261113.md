# REQ-060: Customer onboarding browser verification

Date: 2026-11-13. FR-01.01/01.04 and directly related Guest plan/payment/setup presentation. URL: **http://127.0.0.1:8096/guest/register**.

## Environment and boundary

- Existing isolated `alg-starter-r3` Compose stack: real PostgreSQL, Neo4j, Spring API, Vite/proxy and Chrome.
- Docker 28.1.1, Node 22.15.0, installed Chrome and existing Playwright runner available.
- Email verification, MFA and payOS disabled only in this development stack; signup/resume, orders, provisioning and workspace handoff still use real APIs.
- Legal links intentionally have no policy content and announce their placeholder status. No production legal compliance is claimed.
- Browser data uses unique `@example.test` accounts. No preserved volume is cleared and no real payment is made.
- Password fields are masked in deliberate screenshots; the customer spec disables automatic traces/video/screenshots. Email/security presentation fixtures do not capture authenticator secrets/recovery codes.

## Executable tests and first run

New `frontend/system-tests/REQ-060-onboarding-customer.spec.ts` covers desktop/mobile registration, required/invalid input, keyboard comboboxes, placeholder consent, lossless Back, persisted contact after reload/sign-out/resume, EN/VI, optional nulls, reduced motion, plan/payment/setup and workspace handoff. Email/security/error presentation uses explicitly isolated response fixtures; it is not evidence of live email delivery or MFA enrollment. Real email/TOTP/session enforcement is covered by the [HTTP/database tests](../integration/REQ-060-onboarding-customer-20261113.md).

The first combined customer/starter-catalog run exited **1: 4 passed, 5 failed**:

| Failure | Observation / disposition |
| --- | --- |
| New desktop workspace navigation | Handoff/full-page navigation was still in progress at the default 5-second URL assertion. The test now asserts the real handoff response before using the repository-standard 30-second navigation allowance. |
| Existing empty-catalog checkout | The 5-second assertion expired while the next page was loading. Keep the actual bypass assertion, with a 30-second rendering allowance. |
| Existing guided catalog, desktop and mobile | The canvas assertion requires more than 50 green pixels. The current untouched graph marks selected nodes orange; the captured filtered graph was highly zoomed out. These broader graph-specific failures are not declared passed or repaired by this onboarding change. |
| Existing Expert Explore Graph | Missing `WORKSPACE_DEVELOPMENT_PASSWORD` prerequisite. The test was not silently skipped or treated as a product failure. Expert graph internals are outside this task. |

The graph source and selection semantics are preserved. Minimum selector/required-input updates were made to the existing registration/catalog/landing specs so they use the new customer labels, phone and consent.

## Final verification and remaining sign-off

| Check | Actual result | Command exit |
| --- | --- | ---: |
| Four customer onboarding scenarios | All 4 passed on the final application source: desktop/mobile real signup, reload/resume, phone/country/consent, EN/VI optional-null case and explicit verification/error presentation fixtures | Included in the combined run below, not an independently green command |
| Combined eight-case run | 6 passed, 1 failed, 1 did not run. Actual picked-catalog provisioning and empty-catalog provisioning passed. The old desktop isolation test expired at its 5-second legacy-route redirect assertion; the serial mobile case did not run | 1 |
| Subsequent three-case workspace rerun | The first signup correctly returned HTTP429 after repeated synthetic signups exhausted the shared per-address hourly quota; 1 failed, 2 did not run | 1 |
| Existing-tenant Playwright isolation procedure | Passed at 1440px and 390px: own workspace allowed, foreign UI generic-not-found without tenant fetches, reciprocal organization subscription API403, no page/5xx errors | 0 |

The old workspace spec now has an explicit local 30-second readiness budget rather than relying on 5-second page-load assumptions; its exact assertions remain unchanged. The quota was **not** cleared, disabled or bypassed, and no data was deleted. Instead the independent isolation procedure reused the real synthetic tenant already provisioned by the passing copy scenario. This validates the boundary behavior but does **not** turn the failed CLI commands into passes.

**Status:** implementation and the observed customer journeys are verified locally, but the wider browser regression gate remains **FAIL / sign-off pending**, not an all-green suite. The two graph-specific assertions and missing Expert fixture prerequisite from the first run also remain unresolved outside this change. A clean gated rerun requires an available signup quota or a separately isolated test fixture/environment, plus the graph/Expert prerequisites where those broader cases are selected.

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8096'
npm.cmd run test:system:f02 -- REQ-060-onboarding-customer.spec.ts REQ-060-starter-catalog.spec.ts REQ-060-061-multi-org-workspace.spec.ts --grep 'real registration|Vietnamese required|verification presentation|empty catalog|a Guest copies|workspaces stay isolated' --output=test-results\onboarding-verified
npm.cmd run test:system:f02 -- REQ-060-061-multi-org-workspace.spec.ts --grep 'a Guest copies|workspaces stay isolated' --output=test-results\onboarding-workspace-verified
```

The supplementary isolation procedure is retained at `C:\Users\WIN11\.copilot\session-state\a46b0a7e-df02-4d2a-bf71-ae7ebae18f5c\files\onboarding-existing-isolation.cjs`. From `frontend`, set `ONBOARDING_EXISTING_TEST_EMAIL` to an existing synthetic `tenant-b-...@example.test` registration from the passing fixture and run that script with Node. It uses only the existing documented local test identities, real session/CSRF endpoints, browser assertions and API403 checks; it creates no new signup. Four isolation screenshots and the two-PASS log are kept beside the script.

## Manual checklist

1. Open the URL above in a signed-out browser. Business name is required; country/industry and workspace address are optional; no company-size field is displayed.
2. Search a country and choose it with Arrow keys/Enter. Escape closes without changing the selection. Country/industry labels follow EN/VI.
3. Continue to the account step. Verify required full name, login email, phone, password/confirmation and initially unchecked consent.
4. Click either legal link: the form remains intact, a placeholder notice appears, and consent is not checked automatically.
5. Submit incomplete/invalid input: the linked error summary receives focus; correcting a field and leaving it clears its stale error without stealing focus. Back preserves entered data and selection.
6. Submit a unique test account. Reload, sign out, resume and confirm the same registration/contact values. No password is stored in browser storage.
7. Choose a plan and review its real terms. In this isolated stack the receipt explicitly says development bypass/not paid. Enter workspace only after actual setup is ready.
8. At 375px and desktop widths, verify no horizontal overflow or obscured actions. Switch to Vietnamese and enable reduced motion. Review screenshots and browser errors rather than relying only on success text.

## Evidence locations

- Latest customer/copy/empty-catalog screenshots and failure context: `frontend/test-results/onboarding-verified/`.
- Earlier corrected-source browser evidence: `frontend/test-results/onboarding-final/`.
- Quota-blocked workspace rerun context: `frontend/test-results/onboarding-workspace-verified/`.
- Initial failed-run screenshots/context: `frontend/test-results/onboarding-customer/`.
- [Unit/build results](../unit/REQ-060-onboarding-customer-20261113.md), [HTTP/persistence results](../integration/REQ-060-onboarding-customer-20261113.md).
- Broader Maven test compilation remains a pre-existing non-green baseline; the full starter/Expert graph suite is not certified.

## Runtime verdict

```text
environment:
  docker: AVAILABLE, 28.1.1
  node: AVAILABLE, 22.15.0
  playwright: AVAILABLE, installed Chrome
  infra-tier: PRIMARY, real PostgreSQL/Neo4j
  browser-tier: PRIMARY, Playwright
startup: PASS, isolated API healthy and catalog GET200 after V65
integration: PASS, exit_code: 0, passed: 28, failed: 0, skipped: 0
e2e: FAIL/PARTIAL, exit_code: 1 for the combined CLI regression gate;
     customer cases passed4, catalog copy/empty cases passed2;
     supplementary existing-tenant isolation exit_code:0, passed2
overall: FAIL / NEEDS_SIGNOFF for the regression gate, not production-ready certification
```
