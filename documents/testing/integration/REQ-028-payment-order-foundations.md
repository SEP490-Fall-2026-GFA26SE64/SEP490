# REQ-028: Payment Order Persistence Foundation

**Date:** 2026-10-22. **Contract:** [approved lifecycle revisions 2/3](../../features/Subscription%20lifecycle/README.md).  
**Status:** Partial backend adapter only. Checkout/reconciliation orchestration and UI are not Complete.

## Actual Run

From repository root:

`.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=PaymentOrderPostgresIntegrationTest,PayOsPaymentGatewayTest,HexagonalArchitectureTest" test`

At 22:24:32 +07:00: **12 passed** (4 order PostgreSQL tests, then-current 5 SDK tests, 3 ArchUnit checks). Java 21.0.6, PostgreSQL 17.6-alpine Testcontainers, V1-V10 and Jackson 2.21.8. No shared database mutation, live mail or provider request.

| Acceptance subset | Expected and observed result |
| --- | --- |
| SL-AC02/15 | Order ID/context, all six immutable commercial fields, provider code, creation/expiry and attempt round-trip. Checkout/link/observed-paid/confirmation remain null before provider observation; no fabricated zero-paid fact. |
| SL-AC02 | Deadline is exactly 1,800 seconds from second-aligned creation, matching provider timestamp precision; one durable create job is saved atomically. |
| SL-AC02/04 | Two concurrent identical commands return the same order and produce one order/intent/job. |
| SL-AC04 | A different command cannot duplicate a pending order. Replacement is denied until a test fixture supplies a terminal provider state with observed zero paid; replacement preserves logical intent and uses a new provider code once. |
| SL-AC01/04/15 | Stale version, forged owner and reused key with different terms are rejected without creating another order. Another registrant's current-order view remains empty. |

Fixture setup represents already verified registrants and terminal provider facts directly in the disposable database; these tests do not prove the still-unimplemented webhook/reconciliation pipeline or live payment outcomes.

## Remaining

`JdbcPaymentOrderStore` and the SDK adapter are not yet composed into runtime payment endpoints/workers. Real provider observation persistence, uncertain/late processing, activation/provisioning, renewal, frontend and Playwright remain Not Run. The existing checkout UI is unchanged. This is not REQ-028 completion.

## Completion Follow-up: 2026-10-23

The preceding section preserves the 2026-10-22 partial checkpoint. Runtime composition is now implemented. `PaymentOrderPostgresIntegrationTest` has **15 passing tests** in the final full **233-test** backend run, including verified once-only setup, stale/unpaid event ordering, duplicate financial references, forced rollback/retry, expired leases, active/expired renewal, final-seat races, downgrade reservation and capacity remediation. [Processing evidence](REQ-045-payment-processing.md) and [Guest Playwright](../system/REQ-028-subscription-purchase.md) document actual runtime coverage. No live provider acceptance is claimed.
