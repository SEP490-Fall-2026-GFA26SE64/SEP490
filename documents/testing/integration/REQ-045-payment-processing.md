# REQ-045: Durable Payment Processing

## R1 notification and metadata follow-up, 2026-10-26

The [final focused 78-test run](../unit/REQ-039-transactional-email.md) passed, exit 0, including SDK package/item/amount/memo assertions, new result callbacks, existing signature/provider rules and PostgreSQL payment processing. [Payment notification integration evidence](REQ-039-payment-notifications.md) covers atomic event deduplication, actual purchaser routing, SMTP failure/retry and independence from provisioning. No live merchant calls or schema changes.

**Run date:** 2026-10-23. **Scope:** approved local Subscription Lifecycle revisions 2/3.  
**Environment:** Java 21, PostgreSQL 17.6 Testcontainers, actual payOS SDK 2.0.1, Jackson 2.21.8, isolated signed HTTP/webhook fixtures. No live merchant traffic.

## Executed Checks

| Command / suite | Result | Acceptance |
| --- | --- | --- |
| `.\backend\mvnw.cmd -f .\backend\pom.xml test` | Exit 0; 233 passed, 0 failed/errors/skipped, finished 12:08:56 +07:00 | Full backend regression, including API/security, PostgreSQL/Neo4j and ArchUnit |
| `PaymentProcessorTest` | 3 passed | SL-AC02/04/06: uncertain queries do not create a second order; trusted absence retries only the same code before expiry; expiry does not fabricate unpaid status |
| `PayOsPaymentGatewayTest` | 7 passed | SL-AC06: actual SDK signed-response checks, raw signed webhook fields, tampering, mismatches, null optional fields, missing configuration, no blind create retry |
| `PaymentOrderPostgresIntegrationTest` | 15 passed | SL-AC02/04/06/07/08/09/13/15/17: persisted terms, idempotency, application, recovery, periods and seats |
| Final strict plan/auth/API/ArchUnit selector | Exit 0; 12 passed at 12:12:35 +07:00 | Fractional/string integer inputs rejected; administrator promotion requires fresh sign-in; unchanged isolation |

The focused 28-test payment/architecture selector also passed before the final full run. Counts are overlapping suite executions, not additional unique tests.

## Verified Outcomes

- Concurrent identical commands produce one order/intent/create job. Wrong owner, stale plan, changed payload with reused key and competing unresolved payment are rejected.
- A signed valid late payment on an unreplaced order is retained and applied once. A replaced late payment becomes a visible exception; a provider reference cannot fund another order.
- Wrong currency/amount/link/signature never activates. Older unpaid observations cannot erase confirmed payment or known partial funds. Unknown monetary values remain null.
- Recorded payment and application are separate. A forced database failure during period creation rolls back workspace/subscription/member setup, preserving paid evidence; retry creates one period/workspace.
- Expired worker leases are reclaimed with a different lease token. A stale worker cannot finish the replacement worker's job.
- Verified payment application, initial workspace/member/subscription creation and readiness commit atomically in PostgreSQL. No separate Neo4j catalog content or tenant database is fabricated.
- Replay cannot duplicate periods or move committed boundaries. Durable jobs and reconciliation use the same existing order code/link; failed processing remains visible/retryable.

## Preserved Failures and Corrections

- The first browser purchase run exposed nullable-Long unboxing in the order observation merge. Fixed without converting unknown paid amount to zero; added `checkoutCreationRetainsUnknownPaidAmountWithoutUnboxingNull`, then reran persistence and browser checks successfully.
- The first full backend run reported 231 tests, 5 errors because an isolated test fixture controller/configuration was accidentally discoverable in starter/non-web test contexts. Marked the fixture components/configuration as test-only; the focused starter/worker regression and final 233-test run passed.
- Historical 2026-10-22 dependency/SDK failures remain in [dependency evidence](../unit/REQ-045-provider-dependencies.md) and [SDK evidence](../unit/REQ-045-payos-verification.md).

Live payOS acceptance is **Not Run / excluded by the user's local-only DoD**, not Passed. Refunds, cancellation, automatic recurring charging and manual payment overrides remain excluded.

## Final Recovery Follow-up

The payment/API/SDK/architecture selector passed **31 tests**, exit 0 at 12:21:20 +07:00 after explicitly mapping application-storage failure to a retryable domain failure. The strengthened persistence assertions then passed in the final **18-test** processing/ArchUnit run at 12:33:01 +07:00:

- A failed paid-order application remains `PAID`, with a visible `SERVICE_UNAVAILABLE` failure and a `RETRY` job.
- Successful retry clears that failure and creates one paid period.
- Stale worker errors cannot overwrite a successfully applied result.
- Null organization-role entries produce an explicit invalid-input failure rather than a runtime exception.

These are focused follow-ups to the full 233-test run, not extra unique test totals.
