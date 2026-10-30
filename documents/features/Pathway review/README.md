# Initial Pathway Review

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), and confirmed Expert review decisions. **Aligned:** 2026-10-29. **Source requirements:** 1.

## Requirements

<a id="fr-05-07"></a>

### FR-05.07: Review initial learning pathways

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.07 |
| 2. Requirement Name | Review initial learning pathways |
| 3. Description | The Expert shall inspect an assigned Employee's initial pathway, adjust module membership and prerequisite-valid order, check and preview the draft, then confirm the exact valid revision. |
| 4. Actor | Authorized Expert assigned to the review scope in the same organization. |
| 5. Preconditions | A proposal exists for the Employee's confirmed Role and member Level. The Expert has current access and assignment. Changes and confirmation require a current draft awaiting review; approved and archived pathways are read-only. |
| 6. Main Flow | Open assigned queue/detail; inspect learner context, frozen gaps, Included/Excluded/Catalog, dependencies, warnings and totals; adjust membership or adjacent order; Check and resolve blocking issues; open Roadmap/Timeline preview; finally confirm the inspected valid revision. |
| 7. Alternative / Exception Flows | Missing coverage leaves an editable unresolved draft with reasons and eligible repair suggestions. Invalid eligibility/order is rejected. Stale content requires reconciliation and review again. Access loss denies the operation. An uncertain save retains the exact command for retry. Dependency/transaction failure cannot produce partial edits or approval. |
| 8. Postconditions | Successful changes retain immutable draft revisions and history. Final confirmation records the authorized Expert and exact revision/content identity. The Employee can view the approved pathway; learning access additionally requires availability and readiness. |
| 9. Acceptance Criteria | Assigned scope only; distinct persisted Include/Exclude/Remove; adjacent prerequisite-valid moves; fresh Check with actionable reasons; exact preview/final confirmation; unresolved/stale denial; approved/archive locks; safe retry/concurrency; no catalog/history deletion or mastery change. Detailed rules follow. |

### Review context and inputs

Detail shows a scoped learner display name or identifier, Role and Level, frozen gaps and UNKNOWN reasons, teaching focus/difficulty, providers, dependencies, distinct duration/price, blocking errors and separate advisory warnings. Protected assessment answers, credentials and other learners' data are not review fields.

The Expert supplies pathway/module references, supported intent, expected revision/content identity, retry key and optional reason. Move adds Up or Down. The system derives actor, organization, assignment, eligibility, validation, order and approval metadata. Clients cannot submit mastery, tenant, arbitrary order arrays or approved status.

### Membership and ordering rules

| Action | Required behavior |
| --- | --- |
| Include / Restore | Add a currently eligible Catalog or Excluded module to Included. Recompute coverage, dependencies, warnings and distinct totals without silently replacing another selection. Include-existing is a safe current-revision no-op. |
| Exclude | Remove an Included module and retain explicit exclusion/reason in Excluded. Exclude-absent is a safe current-revision no-op; neutral Catalog modules cannot be preemptively banned. |
| Remove | Clear Included or Excluded membership. Return to neutral Add Existing Catalog Module only while eligible. Remove is distinct from Exclude and deletes neither catalog data nor earlier revisions, overrides or approvals. |
| Move Up / Down | Swap with exactly one adjacent position. Check actual skill prerequisites, provider assignments, valid external evidence and internal gates. Reject provider-after-dependent order when the dependency requires that provider. Explain the required order and preserve draft/history on rejection. Reject boundary/nonmember moves. |

Excluding or removing a required provider may save an unresolved draft. Check explains affected coverage/prerequisites and offers eligible suggestions where available; Include can repair the set. It never invents mastery, silently restores a module or approves incomplete coverage. Titles and LOW/MEDIUM/HIGH do not define prerequisites.

Preserve saved Expert order through Check, reload, preview and confirmation. After membership changes, retain valid relative order and place new prerequisites before dependents. Review validates the fixed selected set without discarding Expert choices to recover a cheaper generation optimum. Advisory fallback warnings alone do not invalidate a complete feasible draft.

### Check, preview and confirmation

Every Check requests fresh server validation. Reload full detail only when the returned content identity differs; otherwise retain the displayed list. Blocking issues show useful reasons and eligible Include suggestions where a repair exists. Include reconciles the saved result and requests a fresh Check; a suggestion is not a validity guarantee.

Approval opens Roadmap/Timeline preview with saved order, teaching details, warnings and totals. Opening, switching or closing preview performs no approval or learning authorization. Only final confirmation submits the exact previewed revision/content identity. The server reauthorizes, verifies current selection/source binding, and validates the fixed set and order again. Stale, unresolved, cyclic, unproved or unavailable validation cannot approve. Approved/archive views expose no edits, including repair actions in Check dialogs.

Cross-list gestures and keyboard/mobile buttons express the same Include/Exclude intents. Same-list drag does not save order; Up/Down provides adjacent reorder. Ignore external/unknown/stale payloads. Lock conflicting actions while busy or outcome is uncertain. Preserve responsive Catalog and Included/Excluded workspaces and equivalent EN/VI labels, feedback and errors.

### Consistency and failures

New commands must match the current editable revision/content identity. Concurrent changes retain a consistent winner and reject stale intent. After current authorization, an exact accepted retry returns its recorded outcome even after later edits; it cannot reapply the action or approve a newer revision. Same key with a different command conflicts. Reconcile unknown outcomes with the same key/body and current detail.

Retain tenant/actor isolation, assignment history, audit and recoverable notifications. Edits do not change baseline evidence, mastery or completion. Regeneration, recalculation, catalog management and learning execution are separate capabilities.

Status: Confirmed.

## Current Implementation

Source-inspected at product `cced745` on 2026-10-29: durable commands, adjacent moves, neutral removal, Check/preview/exact approval and own approved reads exist. Acceptance remains limited to recorded evidence. Deployment dependencies, the Check-dialog lifecycle-guard gap and verification limits are in the [technical contract](../../technical/initial-pathway/Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md) and [reconciliation receipt](../../testing/system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29).

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
