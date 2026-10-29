# REQ-062: Entitlement Foundation Evidence

**Date:** 2026-10-22. **Contract:** [Subscription Lifecycle](../../features/Subscription%20lifecycle/README.md).  
**Status:** Domain/schema foundations only; runtime entitlement enforcement is not Complete.

## Actual Checks

`.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=SubscriptionPlanTest,SubscriptionAccessPolicyTest,SubscriptionCatalogServiceTest,HexagonalArchitectureTest" test`

At 21:18 +07:00: **17 passed** (5 plan/calendar, 5 access/seat policy, 4 catalog service, 3 ArchUnit). The catalog suite later grew to 5 tests and passed in the 21:38 focused run recorded under [REQ-032](../integration/REQ-032-plan-configuration.md).

| Acceptance subset | Assertion | Actual result |
| --- | --- | --- |
| SL-AC08 | Vietnam calendar month ends, leap/non-leap February and retained January-31 anniversary into March | Passed at domain level |
| SL-AC08/10 | Half-open intervals include start and exclude the exact end; pre-start and absent periods deny | Passed at domain level |
| SL-AC09 | Only active accounts with active Employee membership consume a seat; multiple roles count once | Passed at domain level |
| SL-AC09 | Admission limit is the minimum current/pending/scheduled allocation; expired allocation zero admits none | Passed at domain level |
| SL-AC10 | Employee needs paid, ready, unsuspended same-organization membership; administrators require MFA | Passed at domain level |
| SL-AC10 | Expired administrator retains billing/renewal/seat reduction; suspension prevents renewal/reduction; platform authority does not grant private workspace access | Passed at domain level |
| SL-AC15 | V9 membership cross-organization FK and mandatory Employee department/occupation references | Passed in disposable PostgreSQL schema tests at 21:13 |

## Not Yet Verified

No payment-driven periods, membership activation flow, concurrent last-seat admission, pending renewal reservations, late-capacity recovery, scheduler/restart behavior, integration into all existing protected operations or Playwright entitlement checks have been implemented/verified end to end. Domain predicates are not a substitute for those required tests. No feature completion is claimed.

## Completion Follow-up: 2026-10-23

The above is the retained foundation-only checkpoint. [Period/seat/access integration](../integration/REQ-062-subscription-entitlements.md) and [organization browser flows](../system/REQ-066-subscription-management.md) now verify the approved runtime behavior, including concurrent admission, downgrade/late-capacity handling, real activation and suspension. Full backend regression: **233 passed**. The strengthened browser follow-up asserted every administrator-entered Employee field after persistence and isolation between two actually provisioned organizations.
