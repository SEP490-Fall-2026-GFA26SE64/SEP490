# Competency and Adaptive Pathway Engine

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-07.06](#fr-07-06) | Foundation only | The schema includes evidence, profile revisions and mastery estimates; real catalog relationships and target-role selection provide inputs for future gap computation. | No executable backend use case updates learner mastery from answers or computes/publishes competency gaps. Local diagnostic scores/readiness are not knowledge-tracing results. |
| [FR-07.08](#fr-07-08) | Foundation only | Recommendation/pathway schema exists. Selection support records events and can archive provisional pathway state; graph prerequisites and demo roadmap/timeline views exist. | There is no connected module recommender, initial pathway generator or assessment-triggered remaining-pathway recalculation worker. Archiving an old pathway does not generate a new one. |

**Related user surfaces:** `/employee/gap-analysis`, `/employee/pathway` and `/expert/pathway-review` currently demonstrate the intended experience; they do not prove these System functions.

**Code references:** [mastery/evidence schema](../../../backend/src/main/resources/db/migration/V3__assessment_evidence_and_learning.sql), [recommendation/pathway schema](../../../backend/src/main/resources/db/migration/V4__pathway_analytics_and_evaluation.sql), [selection events](../../../backend/src/main/java/com/adaptlearngraph/learning/infrastructure/JdbcTargetSelectionEventAdapter.java), [provisional-pathway archive](../../../backend/src/main/java/com/adaptlearngraph/learning/infrastructure/JdbcProvisionalPathwayArchiveAdapter.java), [pathway package](../../../backend/src/main/java/com/adaptlearngraph/pathway/), [recommendation package](../../../backend/src/main/java/com/adaptlearngraph/recommendation/), [local learning state](../../../frontend/src/shared/hooks/useEmployeeLearningState.ts). Existing package/schema foundations are retained, not reclassified as delivered automation.

## Requirements

<a id="fr-07-06"></a>

### FR-07.06: Update competency profiles and gaps

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.06 |
| 2. Requirement Name | Update competency profiles and gaps |
| 3. Description | The System shall update employee mastery estimates and competency profiles and calculate gaps against selected target roles. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-08"></a>

### FR-07.08: Generate and adapt learning pathways

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.08 |
| 2. Requirement Name | Generate and adapt learning pathways |
| 3. Description | The System shall recommend learning modules, generate initial learning pathways, and recalculate remaining pathways from updated assessment results. |
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
| <a id="req-059"></a>REQ-059 | [FR-07.06](#fr-07-06) |
| <a id="req-059-f01"></a>REQ-059-F01 | [FR-07.06](#fr-07-06) |
| <a id="req-041"></a>REQ-041 | [FR-07.06](#fr-07-06) |
| <a id="req-041-f01"></a>REQ-041-F01 | [FR-07.06](#fr-07-06) |
| <a id="req-041-f02"></a>REQ-041-F02 | [FR-07.06](#fr-07-06) |
| <a id="req-042"></a>REQ-042 | [FR-07.08](#fr-07-08) |
| <a id="req-042-f01"></a>REQ-042-F01 | [FR-07.08](#fr-07-08) |
| <a id="req-043"></a>REQ-043 | [FR-07.08](#fr-07-08) |
| <a id="req-043-f01"></a>REQ-043-F01 | [FR-07.08](#fr-07-08) |
| <a id="req-043-f02"></a>REQ-043-F02 | [FR-07.08](#fr-07-08) |
| <a id="req-046"></a>REQ-046 | Supporting integrity/recovery concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
| <a id="req-046-f01"></a>REQ-046-F01 | Supporting integrity/recovery concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
| <a id="req-046-f02"></a>REQ-046-F02 | Supporting integrity/recovery concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
