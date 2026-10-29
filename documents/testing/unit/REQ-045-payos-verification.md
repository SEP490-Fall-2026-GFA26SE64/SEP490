# REQ-045-F01: payOS Adapter Verification

**Date:** 2026-10-22. **Contract:** [Subscription Lifecycle revisions 2/3](../../features/Subscription%20lifecycle/README.md).  
**Scope:** actual payOS SDK 2.0.1 and Jackson 2.21.8, isolated local HTTP provider doubles. No live merchant traffic.

## Runs and Findings

- Initial `PayOsPaymentGatewayTest,HexagonalArchitectureTest` run at 22:10: 8 tests, one SDK-adapter error. The convenience webhook verifier normalized omitted nullable fields into DTO properties before hashing, changing the original signed field set.
- Inspected the pinned upstream [webhook verifier](https://github.com/payOSHQ/payos-lib-java/blob/v2.0.1/src/main/java/vn/payos/service/blocking/webhooks/WebhooksServiceImpl.java) and crypto implementation. The adapter now invokes the SDK crypto helper on the original signed JSON and performs constant-time signature comparison before SDK DTO normalization. This preserves authentication rather than accepting a failed signature.
- Focused rerun at 22:13:36: **8 passed** (5 SDK, 3 ArchUnit).
- Added forged query-response and valid nullable/unsuccessful webhook cases. Ran `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=PayOsPaymentGatewayTest" test` at 22:26:30: **7 passed**, no failures/errors/skips.

## Assertions

| Scenario | Actual result |
| --- | --- |
| Correctly signed webhook with omitted optional fields | Accepted; order/link/reference/currency/amount/outcome mapped and provider transaction time converted from Vietnam time to UTC. |
| Modified signed amount | Rejected; no outbound request or payment confirmation. |
| Signed null optional metadata and unsuccessful code | Accepted as `UNSUCCESSFUL`, not payment success; no invented paid amount. |
| Matching signed checkout response | Returned only when order/amount/currency/link and checkout host match; paid amount remains unknown. |
| Signed checkout amount mismatch | Explicit payment exception. |
| Query with missing prior currency evidence | Currency remains null rather than defaulting to VND; wrong known link is rejected. |
| Forged query response signature | SDK rejection becomes explicit provider-unavailable outcome, not success. |
| Provider 500 on create | One outbound create only; blind SDK retries disabled. |
| Missing configuration/malformed payload | Explicit failure, never a runtime fake-success fallback. |

## Limits

This verifies the adapter, not a complete payment processing service. Webhook endpoint, stored-order ownership integration, durable observation/application, out-of-order/restart processing, provisioning and renewal remain unfinished. No live payOS acceptance is claimed or required under the revised local-only DoD. Dependency recheck is recorded [separately](REQ-045-provider-dependencies.md).

## Completion Follow-up: 2026-10-23

The adapter is now wired to real lifecycle endpoints and durable workers. Its seven tests passed again in the full **233-test** run. [PostgreSQL processing/recovery](../integration/REQ-045-payment-processing.md) and [Guest retry/restart Playwright](../system/REQ-028-subscription-purchase.md) verify runtime composition. The preceding limitations describe the original partial checkpoint; live provider acceptance remains excluded/Not Run.

## P101-R1 Missing-Order Repair: 2026-10-26

**Approval:** User explicitly selected `approve-p101-r1`; see the [bounded follow-up](../../features/Subscription%20lifecycle/README.md#follow-up-p101-r1-payos-missing-order-response-2026-10-26).

**Environment:** Windows, Java 21.0.6, repository Maven wrapper, existing payOS SDK 2.0.1/Jackson 2.21.8. Test provider is a loopback HTTP server with isolated credentials and signed fixture responses. Processor composition uses the actual SDK/adapter and mocked persistence; no live merchant writes or database changes occur.

### Observed Cause and Change

The preceding read-only diagnosis queried the existing order through the official merchant API and received HTTP 200, code `101`, no data, and a missing-payment description. SDK 2.0.1 maps that envelope to `APIException`; only HTTP 404 maps to `NotFoundException`. The query-first processor therefore retried instead of reaching create.

The adapter now returns an absent observation for query HTTP 200/code `101` only when no link was previously verified. Previously known links remain uncertain. Existing HTTP 404 handling and processor expiry/retry policy remain unchanged. Error logs expose exception type, HTTP status and numeric provider code only, never descriptions, response bodies or credentials.

### Commands and Actual Runs

Run from the repository root:

```powershell
# Focused reproduction, before the production fix
.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=PayOsPaymentGatewayTest#recognizesMissingOrderWithoutInventingPaymentEvidence+processorCreatesFromRealSdkMissingResponseOnlyForUnexpiredUnknownLink" clean test

# Final clean compilation and verification
.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=PayOsPaymentGatewayTest,PaymentProcessorTest,HexagonalArchitectureTest" clean test
```

| Run | Result | Exit code | Evidence / interpretation |
| --- | --- | --- | --- |
| Initial reproduction without `clean`, 18:28 | Failed: 6 tests, 0 failures, 5 errors, 0 skipped | 1 | One genuine `101` adapter failure plus four stale IDE-generated class errors (`Unresolved compilation problems`). Maven had reported nothing to compile; not accepted as full behavioral evidence. |
| Clean reproduction before fix, 18:29 | Failed as expected: 6 tests, 1 failure, 1 error, 0 skipped | 1 | HTTP 200/code `101` raised `SubscriptionFailure`; the eligible processor flow sent only GET instead of GET then POST. The other four cases passed. |
| Final clean run, finished 18:30:34 +07:00 | **Passed: 30 tests, 0 failures, 0 errors, 0 skipped** | 0 | Compiled 227 production and 45 test source files. 24 gateway/composition, 3 existing processor and 3 ArchUnit cases passed. |

Final machine-readable reports:

- [Gateway and SDK/processor composition](../../../backend/target/surefire-reports/TEST-com.adaptlearngraph.subscription.infrastructure.PayOsPaymentGatewayTest.xml)
- [Processor policies](../../../backend/target/surefire-reports/TEST-com.adaptlearngraph.subscription.application.PaymentProcessorTest.xml)
- [Hexagonal architecture](../../../backend/target/surefire-reports/TEST-com.adaptlearngraph.architecture.HexagonalArchitectureTest.xml)

These generated reports may be overwritten by future builds; the dated commands/results here preserve the run history. Existing unrelated `@MockBean` deprecation and Mockito dynamic-agent warnings did not fail compilation/tests.

### Acceptance Results

| Criterion | Assertions | Result |
| --- | --- | --- |
| P101-AC01 | Actual SDK HTTP 200/code `101` and existing HTTP 404 both yield an absent observation for an unknown link; one GET only. | Passed |
| P101-AC02 | Real SDK GET missing -> exactly one POST for the same order code, frozen amount and original deadline; correct return/cancel URLs; stored observation remains PENDING with null paid amount and verified checkout/currency. | Passed |
| P101-AC02 | Exactly at expiry, after expiry, or `101` for a previously known link: GET only, no create/record/finish; retry with explicit uncertainty. | Passed |
| P101-AC03 | HTTP 200/other code, 401/403/429/500 even with code `101`, malformed JSON/missing data and code `101` on create remain provider failures with no automatic SDK retry. | Passed |
| P101-AC03 | Existing signed webhook/query/create checks retain signature, order/link/amount/currency validation and permitted nulls. Error logs exclude private descriptions and reject nonnumeric/injected error-code text. | Passed |
| P101-AC04 | Existing processor uncertainty/same-code/expiry tests and hexagonal boundaries pass; clean production/test compilation succeeds. | Passed |

### Manual Checklist and Limits

**Reproducible without merchant traffic:** open `backend/src/test/java/com/adaptlearngraph/subscription/infrastructure/PayOsPaymentGatewayTest.java` in the editor and run the final command above. Expect 30 passing tests, including actual loopback GET -> POST and all negative guards. The HTTP server and SDK client are closed after every test.

**Running-stack follow-up, Not Run in this repair:**

1. Obtain separate authorization to rebuild/restart the backend and, if needed, initiate a live checkout. Do not delete or manually change payment records.
2. With the owning purchase session and an eligible unexpired order, open `http://127.0.0.1:8088/guest/checkout` and reconcile. Expect checkout availability after the worker completes, without a `PROVIDER_UNAVAILABLE` caused solely by `200/101`.
3. The retained order expired at 18:28:20 on 2026-10-26. It must not be treated as paid, given a longer deadline or silently replaced. Recovery requires a separately approved policy; this patch does not unblock that expired order.
4. No bank transfer/payment is part of this checklist. The ngrok webhook endpoint remains `https://stepless-lela-nonexcessive.ngrok-free.dev/api/v1/payments/payos/webhook`; this run does not certify registration or delivery of that webhook.

**Verdict:** Complete for approved local P101-R1. Full-app startup, PostgreSQL/system tests and live provider checkout acceptance were **Not Run**; they are outside this adapter-only DoD. No UI/API/schema changes were made, so Playwright and database migration validation are not applicable to the code delta. The running container was not rebuilt/restarted, and its existing order was not altered.
