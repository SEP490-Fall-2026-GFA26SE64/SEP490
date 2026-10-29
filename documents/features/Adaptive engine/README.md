# Competency and Adaptive Pathway Engine

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-07.06](#fr-07-06) | API-backed slice | Genuine baseline finalization initializes immutable PostgreSQL mastery. RoleGapPreview reads compatible original evidence for an explicit Role+Level without writes. | Later-learning mastery processing remains separate; real-auth workspace runtime verification and production semantic/publication integration remain open. |
| [FR-07.08](#fr-07-08) | API-backed slice | Durable admission, bounded deterministic initial planning, fixed-set Expert validation and immutable approved revisions are implemented behind ports. | Shared development uses explicit catalog/planning/assignment fixtures; production owner adapters and post-learning recalculation remain incomplete. |

**Related user surfaces:** Role gap review in `/employee/upskilling?tab=roles`, `/employee/pathway?view=role` and `/expert/pathway-review` consume the initial-pathway APIs. The separate legacy gap screen and independent-skill browser state are not this workflow's authority. Source integration alone does not establish runtime acceptance.

### Confirmed initial-pathway rules

- Preview uses original persisted conservative mastery on a 0..1 scale: known gap is max(0, requiredScore − mastery); confidence is explanatory, not another penalty. Genuinely absent compatible evidence remains UNKNOWN/null with a reason; corrupt/unavailable expected evidence is an error. Preview changes no selection, profile or pathway.
- Explicit confirmation binds the Role and its chosen member Level, expected selection/input identity and retry key. Full-Occupation baseline evidence is reused; a Role/Level change never resets baseline history or reopens the completed allowance.
- Planning retains per-TEACHES PRIMARY/SUPPORTING/INCIDENTAL and LOW/MEDIUM/HIGH, exact feasibility/prerequisites/version/tenant checks, bounded whole-path proof and the confirmed objective. A search limit does not publish a successful approximate proposal.
- Expert Include/Exclude/neutral Remove validate the fixed selected set. Adjacent Move Up/Down saves prerequisite-valid order; Check, membership changes, preview and exact final approval preserve that order wherever dependencies allow. Invalid membership edits stay repairable and cannot approve. Keep receipts, CAS/claim fencing, immutable format1/2 readers and archived history. Learning execution and later recalculation are separate scope.

Detailed fields, failures, ordered reads/writes and acceptance G/P/R/E remain in the [shared technical contract](../../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) and [workspace integration boundary](../../technical/Workspace%20Adaptive%20Integration.md).

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
| 3. Description | The System shall recommend learning modules, generate initial learning pathways, and recalculate remaining pathways from updated assessment results. The rules below define the initial-generation and direct Expert-review dependency only; later recalculation is separate scope. |
| 4. Actor | System, triggered by the Employee's explicit confirmed target Role+Level. Assigned Expert subsequently reviews. |
| 5. Preconditions | Valid original compatible baseline/mastery; authorized Employee/organization and member Role+Level; current preview/selection identity; coherent versioned catalog, eligibility, prerequisite and planning policies. |
| 6. Main Flow | Recompute and confirm authoritative input; durably accept generation; prepare required learning needs and eligible providers; derive prerequisite/gate dependencies; perform bounded deterministic whole-path planning; persist an explained ordered proposal; expose it for assigned Expert review. |
| 7. Alternative / Exception Flows | No mandatory learning need produces a separate no-learning-required outcome. Missing providers, cycles, invalid mappings, search uncertainty, stale input or dependency failure cannot become a valid successful proposal. Expert membership edits may retain unresolved drafts for repair; invalid adjacent moves are rejected without change. |
| 8. Postconditions | Retain immutable source/evidence/selection identities and proposal history, distinct module totals, dependencies, warnings and validation state. Generation itself grants neither approval, completion nor learning entry. |
| 9. Acceptance Criteria | Preserve mandatory coverage, PRIMARY/fallback rules, UNKNOWN provenance, exact versions and deterministic bounded objective; no partial/approximate success at search limit; fixed-set Expert review retains saved valid order; exact approval and own safe projection use the same revision. |

Initial-generation status: Confirmed. Recalculation and learning execution remain outside this scoped definition. [Expert review requirements](../Pathway%20review/README.md#fr-05-07) define the dependent membership/order/Check/approval behavior. Runtime integration and verification limits remain in the [shared technical design](../../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#8-implementation-alignment-and-remaining-dependencies).

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
