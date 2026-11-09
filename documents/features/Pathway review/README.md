# Initial Pathway Review

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), and confirmed Expert review decisions. **Aligned:** 2026-10-29. **Source requirements:** 1.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Requirements

<a id="fr-05-07"></a>

### FR-05.07: Review initial learning pathways

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.07 |
| 2. Requirement Name | Review initial learning pathways |
| 3. Description | Assigned Expert reviews the Employee's initial requirement steps, eligible module alternatives/certificate provision and dependency order, then approves the exact valid revision. Authorized Expert also resolves missing provision, certificate evidence and scoped bypass as described below. |
| 4. Actor | Trusted same-organization Expert assigned to the selected Role, with current decision authority. |
| 5. Preconditions | Request is bound to selected Role/member Level; editable initial proposal or an authorized unresolved/evidence decision exists; current revision and assignment are valid. |
| 6. Main Flow | Open assigned context; inspect requirements/provenance, alternatives, dependencies and unresolved needs; repair invalid provision/order or explicitly decide scoped bypass; Check and preview; confirm exact valid initial revision. |
| 7. Alternative / Exception Flows | Missing provision/cycles/stale versions stay unresolved; authorized bypass is separate from achievement. Assignment loss/foreign records deny access. Uncertain outcomes retry the same command. |
| 8. Postconditions | Initial approval records actual Expert and exact requirement/choice/dependency revision. History/progress/evidence remain. Learning still requires live access/prerequisite/content guards. |
| 9. Acceptance Criteria | Own assigned scope, complete requirement coverage or explicit bypass, exact approval, safe concurrency/replay and no achievement from review. Valid later supplementation is automatic without another Expert approval. |

### Review context and inputs

Show scoped learner identity, bound Role/member Level, explicit skill–knowledge/outcomes, official achievement versus baseline diagnostics, unmet/bypassed needs, provision mode, equivalent module choices or assigned certificate, dependencies and actionable missing reasons. Duration/price are descriptive, not a global optimization objective. Numeric gaps, mastery-thirds difficulty and teachingFocus fallback no longer define valid choices. Protected answer keys, credentials and foreign learner data are not review fields.

Client supplies references, supported intent, expected revision/content identity, retry key and decision reason where required. The server derives organization, actor, assignment, eligibility, validation, reviewer/time and decision status. Neither a client-provided achieved profile nor an arbitrary approved status is accepted.

### Requirement coverage, alternatives and ordering

Generation supplies ALL eligible interchangeable alternatives per requirement. Review validates exact skill/knowledge/outcome equivalence, publication/access/content versions and dependencies; it does not choose a cheaper optimal subset or require the Employee to complete every module.

Expert may reduce the generated eligible module alternatives during review, using exact step/module/revision/content keys and preserving requirement coverage, history and existing progress. This is a confirmed choice rule, not an optimizer objective or waiver. Current source retains started-option protection; code confirmation must distinguish that safeguard from authorized removal of unstarted alternatives. A missing final provision stays unresolved unless the confirmed missing-provision-only bypass rule applies. After one qualified module and assessment fulfils the step, other eligible modules remain available for voluntary learning under normal access and their own assessment conditions. No separate neutral Remove endpoint is implied.

Preserve user-controlled valid relative order, but prerequisites must precede dependents. Invalid moves leave state unchanged with reasons; unrelated requirements are not gated by mere display order. Current source allows explicit order only for unstarted, non-bypassed, unfulfilled and non-dependency-bound requirements; fixed positions cannot move. The existing visual system remains.

### Check, preview and confirmation

Check uses fresh authorized validation of current requirements, choices, dependencies, bypass scope and versions, with actionable repair/missing-provision reasons. Save unresolved work for repair; no silent removal of needs or automatic achievement. Initial approval covers established target needs with valid provision or explicit bypass; it does not pre-add unassessed prerequisite needs from baseline.

Roadmap/Timeline preview represents the exact saved revision. Viewing/switching/closing it grants no approval or learning access. Final confirmation reauthorizes and validates the same current revision and binding. Stale/unresolved/cyclic/unavailable validation cannot approve; reconcile and inspect again. Approved/archived initial revisions are read-only; later adaptations are new history, not edits to old approvals.

After initial approval, recalculation automatically adds/reuses valid supplemental requirements and alternatives without a second Expert approval. Missing module/certificate or unresolvable configuration routes to Expert. This is distinct from regenerating or replacing the Employee's target.

### Certificate and missing-provision decisions

- Catalog authoring uses [Add certificate](../Learning%20catalog/README.md#expert-add-certificate): skill + knowledge level, Add, certificate requirement with mandatory reference URL. It is not a learner approval.
- Employee [submits evidence](../Employee%20experience/README.md#certificate-evidence-and-review) as link OR PDF OR picture for the single assigned certificate definition. Expert inspects exact submission/definition versions, identity/scope and private authorized attachment access; approves/rejects with actual reviewer/time/reason and retained history.
- Submission alone remains pending; only authorized approval records exact official achievement and triggers coherent recalculation. Rejection stays unmet with a reason/resubmission path; outage, inaccessible/invalid evidence or stale review does not approve. Catalog definition changes do not rewrite old decisions.
- Missing provision is NEEDS_EXPERT_ACTION. Expert can provide eligible content/definition through owning workflows or explicitly bypass Employee + requirement/pathway with reason/history. Bypass is allowed only when no suitable module/certificate exists; available suitable provision cannot be waived. Bypass remains unmet/waived, never ACHIEVED. Repeated decisions cannot duplicate achievements or bypasses.
- Prerequisite bypass temporarily unlocks dependent learning; non-prerequisite bypass permits other work. Later provision follows [backfill rules](../Adaptive%20engine/README.md#recalculation-bypass-and-later-provision), preserving started/completed work. On another target, original bypass needs are carried as parallel supplementation, not prerequisite gates on its other skills.

### Consistency, target binding and visual continuity

Concurrent finalization, certificate decision, bypass, provision changes and target commands must retain one coherent authorized revision and retry outcome; stale intent cannot overwrite newer accepted decisions. Exact accepted retries return their recorded result after reauthorization, without reapplying to a later revision. Reused key with changed command conflicts. Keep assignment/decision/audit history and recoverable notifications; external delivery failure cannot masquerade as an uncommitted decision or generate duplicate business effects.

The request-bound Role AND Level lock includes pending initial review. No review/repair/selection route may archive unfinished work to bypass it. [Selection lifecycle](../Role%20guidance/README.md#rolelevel-selection-and-lock) defines completion/bypass release and open exceptional release policy.

Retain current review queue/detail, list/dialog/actions, graph/timeline styling, tokens, fonts, sizes, spacing, density and EN/VI. Requirement roots branch to alternatives; no layout/component redesign. Current certificate review uses actual pathway assignment and immutable submission/definition versions. Upload limits and source mapping are in the technical contract. General expiry and self-cancel target release are excluded; full late-backfill/certificate/bypass behavior remains unverified. Applied schema has not been inspected in this task.

## Current Implementation

Source-inspected at HEAD `61d334c` on 2026-11-07: RequirementPathwayReviewService now checks/saves exact per-step module selections and supported requirement order, approves revision/hash under actual assignment, and records bypass/refresh history. Source presence does not establish runtime acceptance of every branch. Acceptance remains limited to recorded evidence. Deployment dependencies, the Check-dialog lifecycle-guard gap and verification limits are in the [technical contract](../../technical/initial-pathway/Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md) and [reconciliation receipt](../../testing/system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29).

Entry points: `/expert/pathway-review` and `/expert/pathway-review/:pathwayId`. `/expert/guidance-review` redirects here; it is not another approval workflow. See [Include](../../technical/initial-pathway/Pathway%20adjustment/Include%20Pathway%20Module.md) and [Exclude](../../technical/initial-pathway/Pathway%20adjustment/Exclude%20Pathway%20Module.md).

## Legacy ID Traceability

IDs/anchors remain reserved. Current scope uses REQ-019-F01 and REQ-020-F01/F02; adjacent moves and neutral removal introduce no new Function. REQ-019-F02 remains historical and does not authorize regeneration.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-019"></a>REQ-019 | [FR-05.07](#fr-05-07) |
| <a id="req-019-f01"></a>REQ-019-F01 | [FR-05.07](#fr-05-07) |
| <a id="req-019-f02"></a>REQ-019-F02 | [FR-05.07](#fr-05-07), historical only |
| <a id="req-020"></a>REQ-020 | [FR-05.07](#fr-05-07) |
| <a id="req-020-f01"></a>REQ-020-F01 | [FR-05.07](#fr-05-07), Include |
| <a id="req-020-f02"></a>REQ-020-F02 | [FR-05.07](#fr-05-07), Exclude; neutral removal is distinguished above |
