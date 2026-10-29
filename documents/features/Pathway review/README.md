# Initial Pathway Review

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 1.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-05.07](#fr-05-07) | API-backed slice | Assigned Experts read persisted queue/detail, include/exclude eligible Modules, validate and confirm an exact current revision/hash through backend commands. | Production assignment/revocation remains an owner dependency; shared development has an explicit bounded assignment substitute. Real-auth runtime verification remains open. |

### Confirmed review behavior

Authorize the current Expert/organization/assignment before existence, learner context or queue paging reads. Include/exclude are intent commands with retry key and expected revision/hash; the server owns feasibility/order. Preserve persisted exclusion reasons/history and warnings; drag/drop and buttons call the same commands. Approval reauthorizes and validates the exact fixed selected set, then atomically stores the exact approval/receipt/audit/outbox. Replay never approves a newer revision. Stale input/revision conflicts; unresolved coverage cannot be approved. Approved/archived plans are read-only. Regeneration, manual reordering and preemptive Catalog exclusion are outside this initial scope.

Keep the confirmed four-card queue, horizontal Catalog and aligned Included/Excluded workspaces, responsive EN/VI, pending/empty/error states and keyboard buttons. Detailed retained contracts: [review](../../technical/initial-pathway/Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md), [include](../../technical/initial-pathway/Pathway%20adjustment/Include%20Pathway%20Module.md), [exclude](../../technical/initial-pathway/Pathway%20adjustment/Exclude%20Pathway%20Module.md).

**Entry point:** `/expert/pathway-review`. The old `/expert/guidance-review` route redirects here, and the old component re-exports the pathway page; it is not a separate AI-guidance approval workflow.

**Code references:** [Expert pathway review](../../../frontend/src/features/expert/pathway-review/ExpertPathwayReviewPage.tsx), [route wiring](../../../frontend/src/app/App.tsx), [backend pathway package](../../../backend/src/main/java/com/adaptlearngraph/pathway/). Employee approval is read from the exact persisted approval, never a browser banner or localStorage value. See [workspace limits](../../technical/Workspace%20Adaptive%20Integration.md).

## Requirements

<a id="fr-05-07"></a>

### FR-05.07: Review initial learning pathways

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.07 |
| 2. Requirement Name | Review initial learning pathways |
| 3. Description | The Expert shall review initial learning pathways, include or exclude suggested modules, and confirm the pathways. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-019"></a>REQ-019 | [FR-05.07](#fr-05-07) |
| <a id="req-019-f01"></a>REQ-019-F01 | [FR-05.07](#fr-05-07) |
| <a id="req-019-f02"></a>REQ-019-F02 | [FR-05.07](#fr-05-07) |
| <a id="req-020"></a>REQ-020 | [FR-05.07](#fr-05-07) |
| <a id="req-020-f01"></a>REQ-020-F01 | [FR-05.07](#fr-05-07) |
| <a id="req-020-f02"></a>REQ-020-F02 | [FR-05.07](#fr-05-07) |
