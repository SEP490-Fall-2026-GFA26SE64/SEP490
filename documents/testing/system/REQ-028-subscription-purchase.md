# REQ-028: Guest Purchase, Reconciliation and Workspace Entry

## R1 checkout and receipt follow-up, 2026-10-26

All three purchase/replay/restart scenarios and the new purchaser-email/receipt scenario passed in the final **8/8 billing/admin suite, exit 0**. Shared Guest layout, package summary, order-specific receipt/reload, forged redirect denial and single workspace application remain verified. [R1 run history, screenshots and manual checklist](REQ-039-onboarding-billing-refinement.md) records the actual environment and limits; earlier evidence below is retained.

**Date:** 2026-10-23. **Actual URL:** `http://127.0.0.1:8092/`.  
**Stack:** separate `adapt-learn-graph-subscription-test` Compose project, PostgreSQL/Neo4j, real API/session/worker/UI and test-only signed payOS double. No live payment or email.

## Executed Command

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npx.cmd playwright test --config=playwright.system.config.ts REQ-028-subscription-purchase REQ-032-plan-configuration REQ-066-subscription-renewal --output=test-results\subscription-final
```

**Exit 0, 7 passed, 3.7 minutes** across the three specs. Three scenarios belong to REQ-028:

1. Authorized Guest selects the real Starter plan, confirms stored terms, sees pending payment separately from activation/readiness, and cannot activate via forged return parameters. Signed confirmation and duplicate replay lead to one ready workspace; reload preserves state. Secure session handoff reaches actual organization subscription data. Unauthenticated order read is denied.
2. Restart the **isolated API container only** immediately after verified confirmation. JDBC session/order/workspace state survives, processing completes and replay retains one history entry/current period, with no extra scheduled period.
3. Forged webhook is rejected. The test provider reports a terminal unpaid order; explicit reconciliation enables fresh-term replacement. A competing replacement fails; the new order confirms and provisions correctly.

SL-AC01/02/03/04/06/07/13/16/17 are covered jointly with the [persistence evidence](../integration/REQ-028-payment-order-foundations.md) and [payment processing tests](../integration/REQ-045-payment-processing.md).

## Visual and Runtime Checks

- Desktop and 390x844 mobile screenshots, EN/VI and reduced motion exercised in the Guest flow.
- Payment, subscription activation and workspace readiness remain separate UI states.
- Browser page errors and unexpected failed requests were asserted empty for the main flow.
- Screenshots were visually inspected for overflow/readability; final artifacts are under `frontend/test-results/subscription-final/REQ-028-.../`.
- No Playwright interception pretends that the application persisted a purchase. The only external double is the isolated provider; all application state and APIs are real.

## Run History

Initial CLI selectors with Windows backslashes/pipe expressions failed before test discovery; plain filename selectors resolved this. The first application run found the nullable paid-amount defect recorded under REQ-045. Subsequent primary flows passed, then final retry/restart scenarios passed. A source-mount watcher issue was fixed by enabling polling **only for the isolated test web service**.

## Manual Check

See [the complete manual checklist](REQ-066-subscription-manual-check.md). The test project is stopped after verification with volumes preserved; the existing development project is not migrated or restarted. Live payOS acceptance remains Not Run/outside local DoD; historical Gmail AC-09 remains Blocked.

**Final delivery rerun:** the same three specs with `--output=test-results\subscription-delivery` exited **0**, **7 passed in 3.8 minutes**. This includes consolidated real member/suspension routes and distinct order-total/verified-received-amount presentation. Latest desktop/mobile screenshots were inspected; the earlier run/artifact directory remains preserved.
