# Platform Administration

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-02.01](#fr-02-01) | Partial | The active organizations route lists provisioned workspaces from the backend and supports persisted suspension/reactivation for an authenticated Platform Administrator. | The active screen is not a full registered-organization directory: designated administrator details, subscription detail and organization-profile editing are not supplied by these controls. |
| [FR-02.03](#fr-02-03) | Prototype | Activity navigation displays searchable/filterable browser-stored sample audit events and fixed health indicators. | It is not connected to persisted registration/payment/service/audit telemetry or a real cross-organization aggregation API. A displayed health badge is not a service check. |

**Entry points:** `/platform-admin/organizations` renders [PlatformWorkspacePage](../../../frontend/src/features/subscription/PlatformWorkspaceControls.tsx), not the older [organization prototype](../../../frontend/src/features/platform-admin/PlatformOrganizationsPage.tsx). `/platform-admin/activity` renders the [activity prototype](../../../frontend/src/features/platform-admin/PlatformActivityMonitoringPage.tsx), backed by the [platform browser store](../../../frontend/src/features/platform-admin/platformAdminStore.ts). Plan administration is covered under [Subscription lifecycle](../Subscription%20lifecycle/README.md#current-implementation).

**Backend reference:** [lifecycle API](../../../backend/src/main/java/com/adaptlearngraph/subscription/api/SubscriptionLifecycleController.java) and [workspace persistence](../../../backend/src/main/java/com/adaptlearngraph/subscription/infrastructure/JdbcSubscriptionWorkspaceStore.java). Password-only seeded Platform Administrator identity is a separate implemented slice; see [Workspace administration](../Workspace%20administration/README.md#implemented-policy-reference).

Learning Content supporting control (2026-10-29): `/platform-admin/learning-upload-settings` provides persisted global MP4/image/ZIP limits with actor/time audit and optimistic concurrency. Defaults are 200/5/500 MiB; reducing limits affects new uploads, not accepted historical files. Other roles cannot edit these controls. This is a supporting control for the approved Learning Content extension, not completion of the platform activity-monitoring requirement. [Evidence/checklist](../../testing/system/REQ-013-learning-content.md).

## Requirements

<a id="fr-02-01"></a>

### FR-02.01: Manage organizations

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-02.01 |
| 2. Requirement Name | Manage organizations |
| 3. Description | The Platform Administrator shall view registered organizations, workspace and subscription status, and designated organization administrators; update organization details; and suspend or reactivate workspaces. |
| 4. Actor | Platform Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-02-03"></a>

### FR-02.03: Monitor platform activity

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-02.03 |
| 2. Requirement Name | Monitor platform activity |
| 3. Description | The Platform Administrator shall view registration and workspace setup outcomes, organization and subscription counts, payment status and amounts, service errors, and administrative audit events. |
| 4. Actor | Platform Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-064"></a>REQ-064 | [FR-02.01](#fr-02-01) |
| <a id="req-064-f01"></a>REQ-064-F01 | [FR-02.01](#fr-02-01) |
| <a id="req-064-f02"></a>REQ-064-F02 | [FR-02.01](#fr-02-01) |
| <a id="req-064-f03"></a>REQ-064-F03 | [FR-02.01](#fr-02-01) |
| <a id="req-064-f04"></a>REQ-064-F04 | [FR-02.01](#fr-02-01) |
| <a id="req-030"></a>REQ-030 | [FR-02.03](#fr-02-03) |
| <a id="req-030-f01"></a>REQ-030-F01 | [FR-02.03](#fr-02-03) |
| <a id="req-031"></a>REQ-031 | [FR-02.03](#fr-02-03) |
| <a id="req-031-f01"></a>REQ-031-F01 | [FR-02.03](#fr-02-03) |
| <a id="req-065"></a>REQ-065 | [FR-02.03](#fr-02-03) |
| <a id="req-065-f01"></a>REQ-065-F01 | [FR-02.03](#fr-02-03) |
| <a id="req-065-f02"></a>REQ-065-F02 | [FR-02.03](#fr-02-03) |
