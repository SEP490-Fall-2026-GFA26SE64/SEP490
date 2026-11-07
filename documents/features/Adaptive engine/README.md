# Competency and Adaptive Pathway Engine

**Latest direction — 2026-11-05-r3.** [Target schema/API/flow](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) now maps this flow; it is not applied runtime. Baseline records only assessed skills and never creates unassessed prerequisites; skill assessment can discover them as **Cần bổ sung**. Baseline/skill have two independently configured policies with timed auto-finalization. Cross-target old bypass work is parallel/non-gating. Affected old dev records may be rebuilt; normal new-flow history remains. Preserve FE design and classify existing Question Bank content into appropriate knowledge levels with corresponding field changes.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

**Feature direction: 2026-11-05.** Requirements below describe intended behavior pending C1 acceptance, not implementation evidence. Dated source/evidence snapshots retain historical scope. IDs/anchors remain. Target technical mapping is now specified in r3; runtime/seed implementation and detailed changed UI review remain pending.

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-07.06](#fr-07-06) | API-backed slice | Genuine baseline finalization initializes immutable PostgreSQL mastery. RoleGapPreview reads compatible original evidence for an explicit Role+Level without writes. | Later-learning mastery processing remains separate; real-auth workspace runtime verification and production semantic/publication integration remain open. |
| [FR-07.08](#fr-07-08) | API-backed slice | Durable admission, bounded deterministic initial planning, fixed-set Expert validation and immutable approved revisions are implemented behind ports. | Shared development uses explicit catalog/planning/assignment fixtures; production owner adapters and post-learning recalculation remain incomplete. |

**Related user surfaces:** Role gap review in `/employee/upskilling?tab=roles`, `/employee/pathway?view=role` and `/expert/pathway-review` consume the initial-pathway APIs. The separate legacy gap screen and independent-skill browser state are not this workflow's authority. Source integration alone does not establish runtime acceptance.

### Previous generation contract — superseded in the new flow

Numeric conservative mastery/gap, full-Job Position baseline reuse, mastery-thirds difficulty, PRIMARY/SUPPORTING fallback and branch-and-bound whole-path optimization no longer define target behavior. Existing [technical contract](../../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) and [integration boundary](../../technical/Workspace%20Adaptive%20Integration.md) retain historical scope until the approved post-DB update. Preserve tenant guards, attempts/evidence, content versions, replay/concurrency, approval history and legitimate dependencies. Consumer/route retirement is future C2 work, not a C1 implementation claim.

**Code references:** [mastery/evidence schema](../../../backend/src/main/resources/db/migration/V3__assessment_evidence_and_learning.sql), [recommendation/pathway schema](../../../backend/src/main/resources/db/migration/V4__pathway_analytics_and_evaluation.sql), [selection events](../../../backend/src/main/java/com/adaptlearngraph/repository/JdbcTargetSelectionEventAdapter.java), [provisional-pathway archive](../../../backend/src/main/java/com/adaptlearngraph/repository/JdbcProvisionalPathwayArchiveAdapter.java), [business services](../../../backend/src/main/java/com/adaptlearngraph/services/), [pathway planning entities](../../../backend/src/main/java/com/adaptlearngraph/entities/), [local learning state](../../../frontend/src/shared/hooks/useEmployeeLearningState.ts). Existing package/schema foundations are retained, not reclassified as delivered automation.

## Requirements

### Profile and evidence precedence

Inputs are trusted Employee/organization, selected Role/member Level, explicit skill–knowledge/outcome requirements, coherent catalog/policy versions and evidence provenance. Preview reads change no selection, profile or pathway. Required knowledge levels are explicit; no inheritance or numeric subtraction applies.

| Evidence/state | Planning effect | Official profile |
| --- | --- | --- |
| Module learning + passing skill assessment with required completion conditions, or approved certificate | Satisfies exact compatible requirement; exempts exact groups on later baseline. | ACHIEVED with provenance/history. |
| Baseline pass | Skips corresponding initial module assignment for that diagnostic context. Later prerequisite failure can require learning. | No ACHIEVED or module completion. |
| Baseline failure | Creates a learning need for that requirement. | No achievement. |
| Missing/incompatible/not-assessed evidence | Explicit unresolved/not-assessed need, distinct from failed. | Never fabricated pass/fail. |
| Later failed prerequisite already officially achieved | NEED_REVIEW/optional review; veto can still block current main result. | Retain ACHIEVED; no forced prerequisite relearning or revocation. |
| Approved scoped bypass | Waives this pathway requirement and can temporarily unlock dependents. | Still unmet/waived, never ACHIEVED. |

Official compatibility includes exact organization/learner, skill/knowledge/outcomes and recognized evidence/version. Self-declared title and baseline scores are not official evidence. Diagnostic reuse is limited to the same unchanged request/context; no cross-target diagnostic exemption. No generalized expiry/revocation engine is added. Affected old dev evidence may be rebuilt rather than migrated.

### Initial requirement steps and alternatives

1. Read selected Role–Level requirements and exact official evidence; consume ready diagnostic groups for MODULE_ONLY and certificate status for CERTIFICATE_ONLY.
2. Identify unmet target requirements actually established by diagnostics/evidence. Do not expand unassessed prerequisite closure from baseline; add shortages only when skill assessment discovers them. Deduplicate by exact requirement identity, not skill alone. Filter provision by knowledge/outcome equivalence, publication, access, content and versions.
3. Create requirement steps with ALL eligible interchangeable module alternatives or the single assigned certificate definition. Missing provision gives NEEDS_EXPERT_ACTION; cycles, unsupported mappings and incoherent versions remain unresolved, never silent omissions.
4. Order dependencies only for established shortages; do not gate initial A learning on unassessed B. Newly discovered prerequisite needs after skill assessment use explicit dependency semantics. Independent requirements are not locked just because displayed later. No global quality/time/cost optimization, branch-and-bound or mastery-based difficulty selection.
5. Persist the proposal for assigned Expert initial approval of requirements, choices and valid order. Generation grants neither approval, content access nor completion.
6. Employee chooses/switches among approved alternatives, preserving each module's pinned content/progress. One qualified module + passing assessment and required completion conditions satisfies the step. Other choices become optional and remain available under normal guards.

If no mandatory work remains, show no-learning-required/exempt context without inventing official achievement. Certificate-only and missing/bypassed needs stay explicit; all-baseline-pass does not mean all skills officially achieved.

Business state meanings below are required; physical state/enum names are not finalized:

| Situation | Visible outcome / permitted action |
| --- | --- |
| Request accepted, generation/review pending | Show request-bound target and progress/retry reason; Role/Level locked; no draft-based learning access. |
| Valid initial proposal awaiting Expert | Assigned review/repair; Employee waits for exact approval. |
| Missing provision or invalid dependency configuration | NEEDS_EXPERT_ACTION/unresolved with exact requirement and reason; retain other permitted work. |
| Approved, required work pending | Available/locked/in-progress requirement steps under live dependency guards. |
| Main group passed but mandatory supplementation pending | Retain result; step remains incomplete until required conditions hold. |
| All required work satisfied or only approved bypass needs remain | Completed/released for next target, with fulfilled versus waived explanation. |
| Historical/archived revision | Read-only history; no implied access or reset of attempts/progress. |

### Recalculation, bypass and later provision

Recalculation consumes accepted assessment results, certificate decisions, valid profile evidence/backfill, bypass decisions and relevant provision changes. Reauthorize and read current pathway/evidence/catalog versions before applying one coherent result. Add/reuse unmet requirement steps and all eligible choices, repair pending dependencies and preserve completed work/progress/history. Valid provision is applied automatically without another supplemental Expert approval. Missing provision/configuration routes to Expert.

[Assessment rules](../Assessment%20workflows/README.md#prerequisite-results-and-full-retake) govern main failure, supplementation, all-wrong veto and full retakes. Keep a passing main group result pending mandatory supplementation without closing the step early or duplicating it. Official prerequisite failure is NEED_REVIEW/optional review, not mandatory relearning. Veto still requires a new full main + ALL prerequisite paper.

Bypass requires authorized Expert decision, Employee + exact requirement/pathway scope, reason and history. It is neither content provision nor achievement. Non-prerequisite bypass permits unrelated work; prerequisite bypass temporarily unlocks dependent learning.

| Later provision for a bypassed requirement | Required effect |
| --- | --- |
| Dependent not started | Relock until supplementation is resolved. |
| Dependent started | Preserve/allow continued content; block new completion until required supplementation is satisfied. |
| Dependent completed | Retain accepted result and add supplementary work; no revocation. |
| Old pathway closed and another target released | Carry original bypass needs as parallel supplementation in the new view; even later provision does not gate other new-pathway skills or reopen the old target. |

Repeated events/commands must not create duplicate remediation, revisions or endless loops. Conflicting graphs remain explicit/recoverable. Result finalization, profile/certificate/bypass updates, backfill and target selection must produce a consistent authorized outcome despite races, with retained retry outcomes/history and recoverable notifications. The r3 technical contract specifies target ownership/version/transaction/replay boundaries; C2 must implement and validate concrete routing.

### Completion, target lock and presentation

Complete when every required item is satisfied or explicitly bypassed and no other mandatory work remains. Show fulfilled versus bypassed/unmet separately. Optional alternatives/review do not require every module to complete or the entire profile to become ACHIEVED.

From pathway request submission, lock BOTH Role and member Level, including pending initial review. Release only after required work is satisfied or only approved bypass needs remain. [Role guidance](../Role%20guidance/README.md#rolelevel-selection-and-lock) defines all-entry enforcement, same-target no-op, browsing, next-target reuse and open exceptional lifecycle rules. Never archive unfinished work to evade the lock.

Pathway hierarchy is **skill/requirement root → module alternatives**, replacing module root → skills. Keep current graph/timeline styling, components, colors, fonts, sizes, spacing and layout conventions. Detailed interactions/data binding need define C2 review; mocks are not BE integration proof.

Target fields/storage/versioning and state rules are specified in r3. C2 still must implement exact scoped constraints, classify real content, handle dependency failures and present detailed changed UI/data binding for review. No runtime/production readiness is claimed.

<a id="fr-07-06"></a>

### FR-07.06: Update competency profiles and gaps

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.06 |
| 2. Requirement Name | Update competency profiles and gaps |
| 3. Description | The System shall maintain exact official skill–knowledge achievements separately from baseline diagnostics and identify unmet target requirements without numeric mastery-gap subtraction. |
| 4. Actor | System |
| 5. Preconditions | Trusted organization/learner, coherent target requirements and compatible evidence provenance. |
| 6. Main Flow | Read explicit requirements and evidence; separate official/diagnostic/unmet/waived needs; consume accepted results once; retain NEED_REVIEW independently. |
| 7. Alternative / Exception Flows | Unknown/incompatible/outage is not pass/fail. Later prerequisite failure never revokes official achievement. |
| 8. Postconditions | Traceable official profile and separate planning needs/history; preview writes nothing. |
| 9. Acceptance Criteria | Baseline never writes ACHIEVED; exact official evidence exempts later baseline groups; bypass stays unmet/waived. |

<a id="fr-07-08"></a>

### FR-07.08: Generate and adapt learning pathways

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.08 |
| 2. Requirement Name | Generate and adapt learning pathways |
| 3. Description | The System shall generate requirement-root pathways with interchangeable module choices/certificate steps and automatically recalculate remaining requirements from accepted results and provision changes. |
| 4. Actor | System, triggered by authorized request or accepted scoped result/provision decision; assigned Expert approves initial pathway. |
| 5. Preconditions | Trusted Employee/organization and selected Role/member Level; coherent explicit requirements, profile/diagnostics, catalog/policy and current request/pathway revision. |
| 6. Main Flow | Resolve established needs without initial unassessed prerequisite expansion; build unique requirement steps with eligible alternatives; order dependencies; persist initial proposal for Expert approval; automatically recalculate valid supplementation from accepted results. |
| 7. Alternative / Exception Flows | No required work has an explicit no-learning-required outcome. Missing provision routes to Expert; cycles/stale/conflicting inputs remain unresolved. No silent omission or target replacement. |
| 8. Postconditions | Versioned requirements, choices, dependencies and reasons preserve history/completed work/independent progress. Generation grants neither approval, achievement nor content access. |
| 9. Acceptance Criteria | One successful alternative per requirement; no optimizer/numeric-gap fallback; deduplicated recalculation, full-retake/veto semantics, scoped bypass/backfill and request-onset Role–Level lock. |

The direction above supersedes the initial-only feature scope. Recalculation/learning are target behavior here; runtime delivery remains separately authorized and unverified. [Expert review](../Pathway%20review/README.md#fr-05-07) defines initial approval and missing-provision decisions. Older technical designs/evidence do not prove this transition is implemented.

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
