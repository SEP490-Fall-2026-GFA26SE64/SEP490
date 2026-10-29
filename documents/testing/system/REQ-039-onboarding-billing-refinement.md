# REQ-039 / REQ-060 / REQ-028: Onboarding and Billing Refinement R1

**Date:** 2026-10-26. **Boundary:** local real-API verification, not live payOS/Gmail acceptance or production readiness.

## Environment

- Docker 28.1.1 daemon functional; Node 22.15.0; installed Chrome and existing Playwright 1.63.
- Isolated Compose project `adapt-learn-graph-subscription-test`; real PostgreSQL/Neo4j/API/session/outbox/UI.
- Frontend: `http://127.0.0.1:8092`; API health: `http://127.0.0.1:18084/actuator/health`; SMTP capture: `http://127.0.0.1:8029`.
- Startup verified HTTP 200 / health UP / inbox HTTP 200.
- Synthetic unique registrants and organizations; existing test-only signed payment provider; captured SMTP only.
- Existing development services at `:8088` / `:18080` and unrelated containers were not replaced or reset. No volumes removed.

## Commands

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
$env:REGISTRATION_TEST_INBOX_URL='http://127.0.0.1:8029'
$env:REGISTRATION_TEST_API_CONTAINER='adapt-learn-graph-subscription-test-api-1'
npm.cmd run test:system:f02 -- REQ-060-registration REQ-039-payment-email REQ-066-subscription-renewal REQ-028-subscription-purchase REQ-022-admin-pages --output=test-results\onboarding-r1-verified
```

The combined repeated run finished **10 passed / 3 failed, exit 1**: the last three registration submissions hit the real shared-IP registration quota, as shown by the explicit rate-limit message. This failed run is retained, not reclassified as Passed. Limits were not weakened and no counters or volumes were cleared.

Final validation was split across the two existing isolated stacks:

```powershell
# Billing / admin / notifications: existing subscription-test stack
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npm.cmd run test:system:f02 -- REQ-039-payment-email REQ-066-subscription-renewal REQ-028-subscription-purchase REQ-022-admin-pages --output=test-results\onboarding-r1-billing-verified

# Registration: independently preserved registration-test stack
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8089'
$env:REGISTRATION_TEST_INBOX_URL='http://127.0.0.1:8026'
$env:REGISTRATION_TEST_API_CONTAINER='adapt-learn-graph-registration-test-api-1'
npm.cmd run test:system:f02 -- REQ-060-registration --output=test-results\onboarding-r1-registration-verified
```

**Passed: 8/8 billing/admin/notification scenarios (exit 0, 4.3 minutes) and 5/5 registration scenarios (exit 0, 1.0 minute), zero skipped.** These two successful runs cover all 13 distinct scenarios on the final implementation.

An additional focused `REQ-022-admin-pages` run passed (exit 0, one scenario, 53.6 seconds) with an explicit `/admin/user` to `/admin/users` redirect assertion plus the complete management flow. Artifacts: `frontend/test-results/onboarding-r1-admin-alias`. This repeats an existing scenario, not a fourteenth distinct journey.

The registration stack was rebuilt with existing isolated test keys retained internally, SMTP directed to Mailpit, payOS credentials empty and payment worker disabled. Its frontend/API/Mailpit readiness was verified at `:8089` / `:18081` / `:8026`. No development configuration or data was reset.

## Scenario coverage

| R1 acceptance | Executable flow / assertions |
| --- | --- |
| AC-01/02 | Desktop and 375px registration: organization/account separation, Back preservation, exact fields/nulls/generated slug, verify email, mandatory MFA, recovery and current session persistence. |
| AC-02/10 | Loading/unavailable and validation preserve entries; linked errors receive focus; expired email/session cannot grant access and return to secure resume. |
| AC-03 | Real verification/activation mail captured as text and branded HTML; activation link still creates the intended organization member. |
| AC-04 | Administrator layout/navigation, real list/filter/detail/create/edit/deactivate/reactivate, retained history/last-admin safeguard, EN/VI/mobile, billing-only separation and cross-role denial. |
| AC-05/07 | Purchased plan/order values, pending/paid/application/readiness separation, forged redirect denial, reload, expiry/retry and API restart recovery. |
| AC-07/08 | Dedicated Guest and Administrator receipts are readable by the correct account and deny stranger/cross-registration access. Successful purchase creates one captured purchaser email despite webhook replay. |
| AC-08/09 | Renewal adds exactly one future paid period and produces a separate purchaser email linking to the correct Administrator order result. |
| AC-10 | Screenshots, overflow assertions, browser errors and failed requests; subscription suspension and Employee assignment/seat regressions. |

## Actual earlier runs and corrections

1. Initial eight-scenario run: **7 passed, 1 failed**, exit 1. Administrator receipt called an unsupported organization-scoped order route. Corrected the frontend helper to the existing global owner-authorized endpoint; added an API helper test.
2. Receipt/registration follow-up: **3 passed, 1 failed, 2 skipped**, exit 1. Mobile test attempted to read the optional organization field on the account step. Updated its Back/Next navigation while retaining the assertion.
3. Combined 13-scenario run: **12 passed, 1 failed**, exit 1. Session query could clear cached registration before a failed action's 401 handler, bypassing the old conditional redirect. The handler now consistently clears secrets and navigates to resume.
4. Registration/receipt delivery run after that fix: **6 passed, zero skipped**, exit 0, 2.1 minutes. Includes restart and expired-proof/session cases on the explicitly allowlisted isolated stack.
5. Additional typography/CTA corrections followed screenshot inspection; renewed tests also assert renewal confirmation email and Vietnamese registration. One test-discovery attempt failed because a new shared helper was nested inside another function; moved it to module scope before rerunning. No scenario ran in that failed discovery attempt.

Previous result directories are retained rather than overwritten. Final passing artifacts are under `frontend/test-results/onboarding-r1-billing-verified` and `frontend/test-results/onboarding-r1-registration-verified`.

## Visual evidence

Screenshots were inspected for organization/account separation, shared Guest brand/progress/footer, mobile receipt, responsive email and Administrator directory/subscription hierarchy. One invisible wordmark was corrected (`text-card` is a color, not typography); financial headings now use shared typography.

Final screenshot names include:

- `registration-organization-step.png`, `registration-desktop-form.png`, `registration-mobile-complete.png`, `registration-mobile-validation.png`.
- `payment-result-desktop.png`, `payment-result-mobile-vi.png`, `payment-email-mobile.png`.
- `administrator-users-desktop.png`, `administrator-users-mobile-vi.png`, `administrator-subscription-desktop.png`.
- `organization-renewal-desktop.png`, `organization-renewal-mobile.png`.

Registration secrets are masked or excluded from screenshots/traces. Rendered receipt/mail examples use synthetic data.

## Manual checklist

Prerequisites: start the isolated test stack, use a synthetic registering administrator with access to Mailpit and an authenticator. Never substitute live payments or actual recipients. User-management Employee creation additionally requires real same-organization department/occupation fixtures.

1. Open `http://127.0.0.1:8092/guest/register` for the full fixture stack, or `http://127.0.0.1:8089/guest/register` for registration-only checks. Only organization fields appear. Submit empty input: inline messages and a focused summary appear. Complete organization details, continue to account, go Back: values remain.
2. Complete the administrator step and inspect captured verification mail at `http://127.0.0.1:8029`. Verify branded HTML, readable code, expiry/security guidance and plaintext content. Complete email/MFA and save recovery codes privately.
3. Open `/guest/plans`; compare name, exact total, duration and Employee seats. Confirm selection; checkout displays the same purchased snapshot and clear payOS action. Do not make a live charge.
4. With the isolated signed-payment fixture, confirm the order. Open `/guest/payment-result?order=<actual-order-id>` and reload. Amount/order/timestamps match the API; payment and workspace readiness remain separate.
5. Inspect the purchaser's payment email. It contains the correct package, total/order and authorized result link. Replay the same fixture webhook: one logical notification remains; workspace creation is not duplicated.
6. Enter the workspace; inspect `/admin/users` (and `/admin/user` alias) and `/admin/subscription`. Verify header/sidebar, filters/row actions/dialogs, retained identity and no user editor on billing.
7. Create/edit/deactivate/reactivate only synthetic users; reload to verify persistence. Keep last-admin, assignment, seat and authorization checks. Email/password/MFA are not editable through the profile form.
8. Renew using fixtures. Verify paid-period continuity, linked payment history, `/admin/subscription/payment-result?order=<renewal-id>` and its separate captured confirmation email.
9. Repeat at 375/390px and desktop, switch EN/VI, use keyboard navigation and inspect console/network. No page-level overflow; table scrolling remains contained.
10. Use another synthetic account: the order API must deny access. Add `status=PAID&success=true` to an unpaid redirect: it must remain unpaid. In isolated expiry fixtures, expired proofs/sessions must show actionable errors without granting access.

## Limits

- No live merchant checkout or real inbox acceptance was performed. Existing registration Gmail AC-09 remains independently Blocked.
- Receipt timestamps distinguish system verification from bank settlement; no bank reference or account details are fabricated.
- SMTP acceptance does not guarantee inbox delivery or exactly-once delivery across acceptance/crash ambiguity.
- No production deployment, development API rebuild, account deletion, dependency installation, schema migration or destructive reset is included.
- Both owned test stacks were stopped after verification with volumes retained. The development web/API/PostgreSQL/Neo4j containers remain running unchanged; the tested new backend image was not deployed to development. Test URLs above describe actual verification endpoints and require restarting the isolated stack for manual reuse.

## Final verdict

```text
environment: Docker 28.1.1, Node 22.15.0, installed Chrome/Playwright available
startup: PASS - both isolated frontends HTTP 200, APIs UP, Mailpit HTTP 200
backend/integration: PASS - exit_code 0; 78 passed, 0 failed, 0 skipped
frontend: PASS - exit_code 0; 29 passed, production build and lint successful
e2e: PASS - final separate runs exit_code 0; 8 + 5 distinct scenarios passed, 0 skipped
overall: PASS - approved local R1 slice; live merchant/Gmail and production readiness not certified
```
