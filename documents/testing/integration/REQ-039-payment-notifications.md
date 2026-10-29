# REQ-039: Durable Subscription Payment Notifications

**Date:** 2026-10-26. **Result:** Passed locally. Real PostgreSQL 17.6 Testcontainers; isolated JavaMail double for deterministic delivery failure. No live SMTP/payOS traffic.

## Executed command

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=PaymentOrderPostgresIntegrationTest' test
```

**21 passed, exit 0.** Also included in the [final 78-test run](../unit/REQ-039-transactional-email.md), not a separate additional coverage count.

| R1 criterion | Scenario and observed result |
| --- | --- |
| AC-08 | Replayed verified PAID observation inserts one `SUBSCRIPTION_PAYMENT_CONFIRMED` event and one `PAYMENT_CONFIRMATION_EMAIL` job for that order. |
| AC-08 | Currency mismatch and partial funds do not create a payment-success event; existing verification/reference/replacement rules still hold. |
| AC-08/09 | Worker selects the actual purchaser account identifier. MIME recipient, subject, multipart text/HTML, package content and order-result link match the stored order. |
| AC-09 | Forced SMTP failure records RETRY; a later worker attempt records SUCCEEDED. Replay after success does not send again in the exercised path. |
| AC-09 | Payment application remains PAID/APPLIED despite failed email; subscription/workspace state is not rolled back by mail failure. |
| AC-10 | Existing snapshot/nullability, concurrency, provider-reference isolation, application recovery, periods, seat and membership tests remain passing. |

Implementation reuses existing outbox/job uniqueness, fenced leases and retry status. No table/column migration or historical notification backfill.

SMTP delivery is at-least-once. A crash after SMTP acceptance but before recording success may repeat a message; one logical event and stable message identity are not an exactly-once inbox guarantee. Operators can inspect `processing_job` handler `PAYMENT_CONFIRMATION_EMAIL`, status, attempts and failure code. Do not print recipient/credential payloads in diagnostic logs.

The first integration attempt failed because the account email is stored as `identifier`, not `email`; this was fixed and the complete suite rerun successfully.
