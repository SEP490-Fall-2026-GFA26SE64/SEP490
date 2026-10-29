# Notifications and Activity Recording

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). The existing email-branding reference below remains applicable.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-07.10](#fr-07-10) | Partial | Durable workers send registration verification, member activation and paid-order confirmation mail through shared HTML/plain templates. Delivery jobs retain retry/failure state. | Paid confirmation is not notification coverage for every payment status. Learning Content issue/new-version notifications now persist in-app and use a durable retryable SMTP worker, verified against local capture. Other approval, role, assessment and pathway workflow email coverage remains incomplete. SMTP configuration and local test mail do not prove live inbox delivery. |
| [FR-07.11](#fr-07-11) | Partial | Identity operations and selected billing/member/workspace changes write persisted audit events. Payment processing and target selection also have durable processing/event records. | A processing/outbox event is not automatically a complete administrator audit trail. Content/role authoring, assessment and pathway event coverage and administrator audit read APIs remain incomplete. |

**Observed separation:** real backend audit records are not the data source of the current administrator/platform activity screens. Those screens use sample or browser-stored logs; The active Learning Content notification bell reads backend records; unrelated browser activity prototypes remain separate.

**Code references:** [verification/activation mail](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/RegistrationMailDelivery.java), [registration worker](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/RegistrationMailWorker.java), [activation worker](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/MemberActivationMailWorker.java), [paid-confirmation worker](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/PaymentConfirmationMailWorker.java), [identity audit persistence](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/JdbcRegistrationStore.java), [member/workspace audit persistence](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/JdbcSubscriptionWorkspaceStore.java), [payment records](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/JdbcPaymentProcessingStore.java). Dated verification and live-delivery limitations remain in the [testing guide](../../testing/README.md).

Learning Content delivery (2026-10-29): issues route to the responsible Expert; new approved versions notify affected pinned learners. Event keys prevent duplicate notification rows, report retry command IDs are stable, and SMTP retains retry/sent state with a stable Message-ID. Local capture establishes delivery to test recipients only; SMTP is at-least-once. Upload-setting edits also record actor/time and prior/next values. [Evidence](../../testing/system/REQ-013-learning-content.md).

## Requirements

<a id="fr-07-10"></a>

### FR-07.10: Send email notifications

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.10 |
| 2. Requirement Name | Send email notifications |
| 3. Description | The System shall send account-verification emails and notifications about payment status and workflow updates. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-11"></a>

### FR-07.11: Record system activity

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.11 |
| 2. Requirement Name | Record system activity |
| 3. Description | The System shall record administrative actions, payment events, content and role changes, assessment submissions, and pathway updates. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Implemented Branding Reference

The existing verification, activation and payment notifications under FR-07.10 now share the supplied orange system icon/dark wordmark embedded directly in the email, alongside the existing HTML/plain alternatives. No remote image fetch, new notification event or fabricated delivery state is introduced. See [current implementation](../../ARCHITECTURE.md#single-role-identity-and-platform-seed-2026-10-28) and [local verification](../../testing/system/REQ-037-single-role-activation.md). Source-only records above and historical traceability below are preserved.

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-039"></a>REQ-039 | [FR-07.10](#fr-07-10) |
| <a id="req-039-f01"></a>REQ-039-F01 | [FR-07.10](#fr-07-10) |
| <a id="req-069"></a>REQ-069 | [FR-07.11](#fr-07-11) |
| <a id="req-069-f01"></a>REQ-069-F01 | [FR-07.11](#fr-07-11) |
| <a id="req-069-f02"></a>REQ-069-F02 | [FR-07.11](#fr-07-11) |
