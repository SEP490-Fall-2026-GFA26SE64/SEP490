# Subscription Lifecycle Runtime Validation Report

**Date:** 2026-10-23. **Target:** approved Subscription Lifecycle revisions 2/3, all 12 functions and bounded dependencies.  
**Delivery boundary:** locally verified implementation; live payOS acceptance and production readiness excluded.

## Verdict

```text
environment:
  docker: AVAILABLE — daemon 28.1.1; real PostgreSQL/Neo4j Testcontainers and isolated Compose used
  node: AVAILABLE — v22.15.0
  playwright: AVAILABLE — existing Playwright 1.63.0 and installed Chrome, actual CLI execution
  infra-tier: PRIMARY — real PostgreSQL/Neo4j/API; external provider double and SMTP capture are approved isolated fixtures
  browser-tier: PRIMARY — Playwright against http://127.0.0.1:8092
startup: PASS — isolated Compose build/up exited 0; API health UP, frontend HTTP 200
integration: PASS — exit_code: 0; full backend 233 passed, 0 failed/errors/skipped
  follow-ups: strict API/auth/architecture 12 passed; payment/API/SDK 31 passed; final processing/architecture 18 passed
frontend: PASS — exit_code: 0; 56 tests across 15 files; TypeScript/Vite build passed
e2e: PASS — exit_code: 0; final 7 passed, 0 failed; 3.8 minutes
overall: PASS — approved local DoD; no live provider or production acceptance implied
```

Counts for focused follow-ups overlap the full suite and must not be summed as unique test totals.

## Coverage and Evidence

- [Guest purchase/status/retry/restart](REQ-028-subscription-purchase.md).
- [Existing plan configuration](REQ-032-plan-configuration.md).
- [Organization renewal, member activation, fields/isolation and suspension](REQ-066-subscription-management.md).
- [Durable payment evidence/application](../integration/REQ-045-payment-processing.md).
- [Calendar, concurrency and request-time entitlement](../integration/REQ-062-subscription-entitlements.md).
- [Per-function and acceptance matrix](../../features/Subscription%20lifecycle/README.md#local-delivery-2026-10-23).
- [Manual checklist](REQ-066-subscription-manual-check.md).

Browser scenarios use real application APIs/stores/session security and synthetic two-organization data. No browser route interception fabricates a successful business operation. Desktop/mobile screenshots, EN/VI, reduced motion, keyboard/dialog focus, console/page errors, failed requests and reload/API persistence were checked. Latest screenshots are under `frontend/test-results/subscription-delivery/`; backend XML reports are under `backend/target/surefire-reports/`.

## Preserved Failures and Corrections

1. Initial Windows CLI test selectors failed before discovery; plain filename selectors resolved this without changing coverage.
2. Initial checkout worker failed on a legitimate null paid amount; nullable merge was fixed and given a PostgreSQL regression test.
3. Initial full backend run: 231 tests, 5 context errors due to test-fixture component discovery in starter/non-web contexts. Test-only markers fixed the boundary; final full run passed 233.
4. Old frontend tests assumed demo login, unsigned mutation requests and unguarded workspace routes. Tests were updated for approved trusted login/CSRF/entitlement behavior, preserving the original target-role action assertions.
5. Browser tests initially read state before create/session handoff completed. They now wait for persisted/visible readiness, not fixed sleeps.
6. Windows bind mounts left the isolated Vite cache stale. Verified that on-disk and served source differed, enabled polling in the isolated override and restarted only its web service. The activation flow then passed.
7. One parallel frontend run hit the existing five-second registration-test timeout. `npm.cmd test -- --maxWorkers=2` passed all 56 without relaxing assertions or increasing test timeouts.

## Known Limits / Warnings

- Live payOS acceptance: Not Run, explicitly excluded from local DoD.
- Historical Gmail AC-09: Blocked, unchanged; Mailpit acceptance is not Gmail delivery.
- Non-test Employee onboarding requires legitimate upstream department/occupation references. Their CRUD/import remains outside scope; missing data yields an explicit prerequisite state.
- Existing large frontend bundle warning and a non-fatal Fast Refresh mixed-export lint warning remain. Lint exited 0; no production readiness/performance certification is implied.
- Retained development database remains V8. No retained/live administrator bootstrap, real payment/email, commit, push, deployment or destructive reset occurred.

## Cleanup

Stopped only `adapt-learn-graph-subscription-test` services after verification. Volumes/data remain. Confirmed no running services in that test project; retained development API reports `UP` and its migration version remains 8. Testcontainers and local HTTP doubles were stopped by their test teardown.
