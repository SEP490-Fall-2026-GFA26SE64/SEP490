# Organization Onboarding

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 3.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. Statuses follow the [implementation legend](../README.md#current-implementation-overview); this is not a new runtime acceptance result.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-01.01](#fr-01-01) | API-backed slice | Guest organization/contact/admin details and password are submitted to registration APIs. Saved registrations support email-code verification/resend, administrator authenticator enrollment, recovery codes and sign-in to resume. | Initial form steps are not a persisted registration until account creation succeeds. SMTP and cryptographic configuration are required; live inbox delivery is not established by this inspection. |
| [FR-01.04](#fr-01-04) | API-backed slice | Guest pages read registration, order/payment and workspace setup state. A completed, paid/provisioned registration can establish a workspace session and enter the administrator area. | Payment confirmation and setup completion are separate states; a checkout redirect is not proof of either. Provider/setup failures must still be resolved before workspace entry. |
| [FR-07.03](#fr-07-03) | API-backed slice | Durable payment application creates the organization workspace, initial administrator membership and paid subscription period, with processing/retry state in PostgreSQL. | This establishes workspace identity and billing, not a complete learning catalog, department lifecycle or all Version 2 workflows in the new organization. |

**Entry points:** `/register`, `/guest/register`, `/guest/resume`, `/guest/onboarding-status`; subsequent purchase is described in [Subscription lifecycle](../Subscription%20lifecycle/README.md#current-implementation).

**Code references:** [registration page](../../../frontend/src/features/guest/GuestRegisterPage.tsx), [registration service](../../../backend/src/main/java/com/adaptlearngraph/identity/application/RegistrationService.java), [setup page](../../../frontend/src/features/guest/WorkspaceProvisioningPage.tsx), [workspace-session handoff](../../../backend/src/main/java/com/adaptlearngraph/identity/api/RegistrationWorkspaceEntryController.java), [payment application and provisioning](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/JdbcPaymentProcessingStore.java). Existing verification is indexed in the [testing guide](../../testing/README.md).

## Requirements

<a id="fr-01-01"></a>

### FR-01.01: Register an organization

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.01 |
| 2. Requirement Name | Register an organization |
| 3. Description | The Guest shall submit organization and contact details, create an administrator account, verify the account email, and resume an incomplete registration. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-01-04"></a>

### FR-01.04: Track onboarding and access the workspace

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.04 |
| 2. Requirement Name | Track onboarding and access the workspace |
| 3. Description | The Guest shall view registration, payment, and workspace setup status and access the organization workspace. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-03"></a>

### FR-07.03: Provision organization workspaces

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.03 |
| 2. Requirement Name | Provision organization workspaces |
| 3. Description | The System shall create organization workspaces, activate subscriptions, and assign the initial System Administrator. |
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
| <a id="req-060"></a>REQ-060 | [FR-01.01](#fr-01-01); [FR-01.04](#fr-01-04) |
| <a id="req-060-f01"></a>REQ-060-F01 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f02"></a>REQ-060-F02 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f03"></a>REQ-060-F03 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f04"></a>REQ-060-F04 | [FR-01.04](#fr-01-04) |
| <a id="req-061"></a>REQ-061 | [FR-07.03](#fr-07-03) |
| <a id="req-061-f01"></a>REQ-061-F01 | [FR-07.03](#fr-07-03) |
| <a id="req-061-f02"></a>REQ-061-F02 | Related to [FR-07.03](#fr-07-03); recovery is a supporting concern under section 3.2(d), not a separate functional requirement. |

## Historical Links

<a id="implementation-brief-registration-first"></a>
<a id="implementation-results-2026-10-21"></a>
<a id="public-landing-and-guest-entry-revision-13"></a>

Older documents link here for implementation briefs or delivery records that are no longer part of this functional-requirements catalog. These compatibility anchors do not reproduce or reconfirm those designs, approvals or completion claims. Consult the dated [testing guides and evidence](../../testing/README.md) for recorded verification; the source-level requirements above do not certify runtime behavior.
