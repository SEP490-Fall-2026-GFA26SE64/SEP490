# Initial Pathway Review

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 1.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-05.07](#fr-05-07) | Prototype | Experts can inspect sample initial pathways, include/exclude modules, add review notes and confirm a local pathway; the page also demonstrates regeneration/review states. | Records live in component state. No backend review command, persisted reviewer/decision, assignment check or Employee learning gate consumes these decisions. |

**Entry point:** `/expert/pathway-review`. The old `/expert/guidance-review` route redirects here, and the old component re-exports the pathway page; it is not a separate AI-guidance approval workflow.

**Code references:** [Expert pathway review](../../../frontend/src/features/expert/pathway-review/ExpertPathwayReviewPage.tsx), [route wiring](../../../frontend/src/app/App.tsx), [pathway/approval schema foundation](../../../backend/src/main/resources/db/migration/V4__pathway_analytics_and_evaluation.sql), [backend pathway package](../../../backend/src/main/java/com/adaptlearngraph/pathway/). The Employee page's fixed confirmation banner is not evidence that a real Expert approved a learner's pathway.

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
