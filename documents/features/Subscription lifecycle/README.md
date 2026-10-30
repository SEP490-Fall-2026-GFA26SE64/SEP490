# Subscription Lifecycle

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 6.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. Statuses follow the [implementation legend](../README.md#current-implementation-overview); live payOS acceptance is not claimed.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-01.02](#fr-01-02) | API-backed slice | Guest pages load existing plans and display name, description, price, currency, calendar-month duration and Employee seats. Order creation supplies the selected plan/version. | Current currency is VND only; selection does not activate an entitlement before verified payment/application. |
| [FR-01.03](#fr-01-03) | API-backed slice | Purchase orders, payOS checkout, order-specific results, reconciliation and replacement/retry flows use backend state and persisted order snapshots. | Retry/replacement eligibility depends on the existing order outcome; unresolved provider state is not treated as an unpaid terminal result. |
| [FR-02.02](#fr-02-02) | Partial | Platform Administrators edit existing plan name, description, price, duration and seat limit; a new version is saved without changing purchased terms. Stale versions are checked. | Currency is displayed read-only in the UI and the backend rejects non-VND values. The source's currency-update capability is therefore constrained, not fully delivered. |
| [FR-03.06](#fr-03-06) | API-backed slice | System Administrators view current/scheduled paid periods, allocated/used seats and payment history, select a plan and pay for renewal. | This is the connected billing slice, not cancellation, refunds, invoices or all organization administration. |
| [FR-07.02](#fr-07-02) | API-backed slice | The payOS adapter creates/queries payment links and verifies webhooks. Durable jobs record observations, validate the order and apply paid outcomes idempotently. | External credentials/provider availability are prerequisites. Browser callbacks alone cannot authorize payment application; live-provider acceptance remains separate. |
| [FR-07.04](#fr-07-04) | API-backed slice | Stored paid periods and seat counts drive purchase/renewal state, serialized Employee-seat admission and request-time workspace access, including suspension and administrator recovery access. | Entitlement checks do not replace the missing catalog-specific trusted actor/assignment integration described in [cross-domain boundaries](../README.md#cross-domain-boundaries). |

**Current inputs/rules:** plans require nonblank name/description, positive whole-VND price, positive calendar-month duration and positive Employee seats. Orders include expected plan version and an idempotency key. Member edits include a revision; purchased terms are immutable. These are observed implementation rules, not newly approved general product policies.

**Entry points:** `/packages`, `/guest/plans`, `/guest/checkout`, `/guest/payment-result`, `/admin/subscription`, `/admin/subscription/payment-result`, `/platform-admin/subscriptions`.

**Code references:** [subscription client](../../../frontend/src/features/subscription/subscriptionApi.ts), [plan editor](../../../frontend/src/features/subscription/PlatformPlansPage.tsx), [lifecycle API](../../../backend/src/main/java/com/adaptlearngraph/subscription/api/SubscriptionLifecycleController.java), [plan terms](../../../backend/src/main/java/com/adaptlearngraph/subscription/domain/PlanTerms.java), [payment processor](../../../backend/src/main/java/com/adaptlearngraph/subscription/application/PaymentProcessor.java), [workspace/seat persistence](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/JdbcSubscriptionWorkspaceStore.java). Dated local evidence and external-service exclusions remain in the [testing guide](../../testing/README.md).

## Requirements

<a id="fr-01-02"></a>

### FR-01.02: Select a subscription

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.02 |
| 2. Requirement Name | Select a subscription |
| 3. Description | The Guest shall view existing subscription plans, compare their price, currency, duration, and allocated Employee seats, and select a plan. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-01-03"></a>

### FR-01.03: Pay for a subscription

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.03 |
| 2. Requirement Name | Pay for a subscription |
| 3. Description | The Guest shall pay for the selected subscription, view payment status, and retry an unsuccessful payment. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-02-02"></a>

### FR-02.02: Configure subscriptions

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-02.02 |
| 2. Requirement Name | Configure subscriptions |
| 3. Description | The Platform Administrator shall update existing subscription plans’ name, description, price, currency, duration, and allocated Employee-seat limit. |
| 4. Actor | Platform Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-03-06"></a>

### FR-03.06: Manage organization subscription

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.06 |
| 2. Requirement Name | Manage organization subscription |
| 3. Description | The System Administrator shall view subscription details, the paid period, allocated and used Employee seats, and payment history; select an existing plan for renewal; and pay to renew the subscription. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-02"></a>

### FR-07.02: Process subscription payments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.02 |
| 2. Requirement Name | Process subscription payments |
| 3. Description | The System shall create payment requests, verify payment outcomes, and record payment status and transaction history. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-04"></a>

### FR-07.04: Maintain subscription entitlements

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.04 |
| 2. Requirement Name | Maintain subscription entitlements |
| 3. Description | The System shall update subscription and renewal status, track allocated and used Employee seats, and control workspace access. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-028"></a>REQ-028 | [FR-01.02](#fr-01-02); [FR-01.03](#fr-01-03); [FR-03.06](#fr-03-06); [FR-07.02](#fr-07-02) |
| <a id="req-028-f01"></a>REQ-028-F01 | [FR-01.02](#fr-01-02); [FR-03.06](#fr-03-06) |
| <a id="req-028-f02"></a>REQ-028-F02 | [FR-01.03](#fr-01-03); [FR-03.06](#fr-03-06); [FR-07.02](#fr-07-02) |
| <a id="req-028-f03"></a>REQ-028-F03 | [FR-01.03](#fr-01-03); [FR-03.06](#fr-03-06) |
| <a id="req-028-f04"></a>REQ-028-F04 | [FR-01.03](#fr-01-03) |
| <a id="req-032"></a>REQ-032 | [FR-02.02](#fr-02-02) |
| <a id="req-032-f01"></a>REQ-032-F01 | [FR-02.02](#fr-02-02) |
| <a id="req-045"></a>REQ-045 | [FR-07.02](#fr-07-02); [FR-07.03](../Organization%20onboarding/README.md#fr-07-03); [FR-07.04](#fr-07-04) |
| <a id="req-045-f01"></a>REQ-045-F01 | [FR-07.02](#fr-07-02) |
| <a id="req-045-f02"></a>REQ-045-F02 | [FR-07.03](../Organization%20onboarding/README.md#fr-07-03); [FR-07.04](#fr-07-04) |
| <a id="req-062"></a>REQ-062 | [FR-07.04](#fr-07-04) |
| <a id="req-062-f01"></a>REQ-062-F01 | [FR-07.04](#fr-07-04) |
| <a id="req-062-f02"></a>REQ-062-F02 | [FR-07.04](#fr-07-04) |
| <a id="req-062-f03"></a>REQ-062-F03 | [FR-07.04](#fr-07-04) |
| <a id="req-066"></a>REQ-066 | [FR-03.06](#fr-03-06) |
| <a id="req-066-f01"></a>REQ-066-F01 | [FR-03.06](#fr-03-06) |
| <a id="req-066-f02"></a>REQ-066-F02 | [FR-03.06](#fr-03-06) |

## Historical Links

<a id="follow-up-p101-r1-payos-missing-order-response-2026-10-26"></a>
<a id="local-delivery-2026-10-23"></a>
<a id="revision-2-implementation-overview"></a>
<a id="revision-3-amendment-shared-json-dependency"></a>
<a id="w2-administrator-pages-refactor--awaiting-approval"></a>

Older documents link here for implementation briefs or delivery records that are no longer part of this functional-requirements catalog. These compatibility anchors do not reproduce or reconfirm those designs, approvals or completion claims. Consult the dated [testing guides and evidence](../../testing/README.md) for recorded verification; the source-level requirements above do not certify runtime behavior.
