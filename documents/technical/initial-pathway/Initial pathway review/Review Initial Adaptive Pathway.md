# Review Initial Adaptive Pathway

**Function:** REQ-019-F01. **Actor:** assigned Expert. **Contract updated:** 2026-10-29.
Business requirements: [FR-05.07](../../../features/Pathway%20review/README.md#fr-05-07). This document defines technical sequencing and implementation alignment; deployment/evidence limits do not alter the business requirement.

## Goal, position and preconditions

After REQ-042-F01 creates an initial proposal for the Employee's confirmed Role+Level, the Expert inspects and adjusts the draft, checks it, previews Roadmap/Timeline and finally confirms an exact valid revision. REQ-020-F01/F02 own Include/Exclude; adjacent Move and neutral Remove extend this existing review scope without introducing Function IDs. Employee display is REQ-004-F01. Generation failures without a proposal cannot be edited as drafts.

Require a trusted active Expert, organization, entitlement and current assignment before scoped existence, learner-context, receipt or queue reads. Only AWAITING_EXPERT_REVIEW is editable/confirmable, including an UNRESOLVED draft. Approved/archive content is immutable. Production assignment/revocation and catalog publication remain owner dependencies, separately described in the shared design.

## Fields and read projection

| Direction | Fields and ownership |
| --- | --- |
| Client read | Opaque pathway ID; queue offset >=0 and limit 1..100. Current API does not accept server search/status/Role filters. UI search/filter/statistics describe the loaded page. |
| Client edit | moduleId, expectedRevision >=1, expectedContentHash (64 lowercase hex), optional reason <=2000 characters, Idempotency-Key. Move adds direction UP or DOWN. |
| Client confirm | expectedRevision, expectedContentHash, Idempotency-Key; no module or arbitrary approval data. |
| Server | Actor/org/learner scope, assignment ID/version, current selection, source/configuration pins, candidate eligibility, provider/gate assignments, validation, ordinals, hash, audit and approval timestamp. |
| Expert output | Summary revision/hash/review/validation/Role/Level and safe learner label; frozen gaps/UNKNOWN; revision selected set/ordered modules/overrides; candidate teaching pairs; dependencies, warnings, diagnostics, quality/search and source pins. Protected keys/theta/SE/credentials/foreign learner data are excluded. |

Workspace learnerLabel uses same-tenant full_name with ID fallback, not account email. Teaching focus/difficulty are per skill pair. PRIMARY normally covers; SUPPORTING coverage needs the confirmed global Primary-unavailability proof; INCIDENTAL cannot cover. Warnings are advisory only when fixed-set validation completes successfully.

## Ordered read, Check and preview flow

1. Authenticate/authorize Expert and assignment. Queue obtains allowed IDs before scoped database paging; detail resolves the assigned organization/learner, request and current immutable revision.
2. Resolve the pinned planning problem through current binding, configuration, graph, availability, suitability and readiness-definition ports. Detail returns candidate offers; client grouping is presentation, not a coverage decision.
3. Present horizontal Catalog and aligned Included/Excluded workspaces. Included uses saved ordinals. Excluded uses each module's latest override only when it is EXCLUDE and the module is not selected. MOVE or REMOVE does not create an excluded membership. Ineligible old exclusions remain visible with Restore unavailable.
4. Check calls GET validation every time. The server reruns fixed-set review, retains explicit Expert order and computes content identity without persisting a revision, approval, receipt or learner-state update. Return validationStatus, diagnostics, revisionContentHash, warnings, quality and search. Identity drift returns STALE. The FE parses the status/hash/diagnostic/warning subset; it keeps displayed quality until detail is reloaded.
5. FE compares returned hash to displayed detail: equal keeps the existing list; different reloads detail. Persisted detail still differing from fresh validation remains STALE and cannot approve. Check never silently repairs or repins a draft.
6. For repairable provider/prerequisite errors, show authorized candidate suggestions and Include. Reconcile the resulting revision then run fresh Check; failed follow-up Check does not turn an already accepted Include into an uncertain mutation. Other mapping/cycle/search errors may have no Include repair.
7. After matching VALID Check, opening approval refreshes detail and validates again. If revision/hash changed since display, stop and require review again. Preview is an authorized Expert draft projection with PREVIEW states, null entries and no Employee-learning authority. Roadmap/Timeline preserves stored ordinals/dependencies.
8. Closing preview returns to editing. Only final confirmation sends the captured exact expected tuple/key. Busy, uncertain outcome, approved and archived states lock all mutation surfaces, including Check repair actions.

## Adjacent ordering and neutral removal

<a id="confirmed-expert-order-and-neutral-removal--2026-10-29"></a>

POST moves swaps exactly one adjacent pair from the previous saved order. Fresh provider/gate assignments and valid external prerequisite evidence determine actual module dependencies. InitialReviewOrder rejects a provider at or after its dependent with 422 PREREQUISITE_ORDER_VIOLATION and diagnostics `PREREQUISITE_ORDER:provider:dependent:skill`. Nonmember and boundary moves reject. Rejection saves no revision, override, receipt or audit/outbox edit.

Successful MOVE_UP/MOVE_DOWN stores new ordinals, content hash and append-only history. InitialReviewOrder.retain preserves explicit order after fresh Check and confirmation. Once explicit order exists, membership changes use stable dependency-valid placement and insert new prerequisites before their earliest dependent. Titles and LOW/MEDIUM/HIGH never supply dependency edges.

POST removals clears a selected or latest-excluded membership by recording REMOVE. A still-eligible module becomes neutral Catalog; ineligible content does not become selectable. Already neutral is a current-revision no-op. Remove never deletes Module catalog data, historical overrides or approvals. Removing a provider may persist UNRESOLVED; Include can repair and confirmation remains denied.

## Mutation, concurrency and final approval

1. Validate request shape/key, authenticate and authorize assigned scope. Hash operation/pathway/expected tuple/module/reason. Direction is represented by MOVE_UP/MOVE_DOWN.
2. In learner coordination, reauthorize and resolve an exact scoped receipt before current-revision checks. Same body/key returns the original result; changed body conflicts. Revoked callers cannot replay.
3. For an unseen command, require current editable revision/hash. Prepare fixed selected set and append the intended override; reread the planning problem and validate without auto-adding/removing choices. Include-existing, Exclude-absent and Remove-neutral are no-ops; they do not rerun the full planner.
4. Reenter the coordinated PostgreSQL transaction, resolve a racing receipt, recheck expected revision, current selection, binding and assignment. A stale selection or revision cannot commit, including a no-op.
5. For edits, atomically insert immutable revision/module ordinals/teaching/dependencies, CAS current pointer, override with Expert/assignment snapshot, receipt and audit/outbox. No-op stores a command receipt without a new edit revision/override.
6. For confirmation, freshly validate the fixed set/order and require the exact persisted content hash. Invalid draft ->422; changed validation identity ->409. Atomically store exact approval, current review status, receipt and audit/outbox. No new module selection, baseline/mastery or completion write occurs.
7. FE reconciles GET after success. Unknown commit/network/invalid response keeps the same body/key; successful send followed by failed reconciliation retries reads, not a second mutation. Old receipt outcomes never act as current access tokens.

## Errors and recovery

| Condition | Result |
| --- | --- |
| Invalid shape/direction/key/expected tuple/reason/unknown properties | 400 INVALID_REQUEST or key validation error; no edit |
| Unauthenticated/wrong role/assignment or tenant failure | 401/403 or safe 404 PATHWAY_NOT_FOUND; no foreign details |
| No proposal | 409 PROPOSAL_NOT_AVAILABLE |
| New stale revision/hash, approved/archive | 409 STALE_REVISION |
| Stale selection/binding/configuration | Conflict or explicit unavailable; no implicit refresh |
| Reused key/different command | 409 IDEMPOTENCY_CONFLICT |
| Include ineligible / move nonmember / boundary | 422 MODULE_NOT_ELIGIBLE / MODULE_NOT_IN_DRAFT / MOVE_OUT_OF_RANGE |
| Dependency inversion | 422 PREREQUISITE_ORDER_VIOLATION plus safe structured reasons; entire draft unchanged |
| Invalid confirmation / validation changed | 422 INVALID_PATHWAY_DRAFT / 409 VALIDATION_CHANGED |
| Dependency/transaction/integrity failure | Explicit 503; no partial approval/edit; reconcile uncertain outcomes with original command |

## Storage, compatibility and implementation alignment

PostgreSQL owns all learner/revision/override/receipt/approval/audit/outbox state. Neo4j supplies read-only catalog data. InitialPathwayReview, InitialReviewOrder, InitialPathwayController and JdbcInitialRevisions are the owning command path. [Shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) defines versions, physical storage and runtime gates.

Workspace V35 is applied according to the dated receipt and only widens initial_pathway_override.action to INCLUDE/EXCLUDE/MOVE_UP/MOVE_DOWN/REMOVE. No new tables/columns/ontology/CRUD. Retain old format1/2 readers/hashes and all new history. Disable new mutations for rollback; do not narrow CHECK, edit applied migrations or use old-only readers.

Source inspection at cced745 finds one UI gap: Check repair passes only busy/uncertain state to ReviewValidation, without the editable/preview lifecycle guard used by PathwayModules. A noneditable record (for example an archived unresolved draft) with a matching fresh UNRESOLVED hash could expose Include suggestions; STALE checks suppress suggestions when hashes differ, and backend still rejects a new non-draft command. This is a conditional source finding, not reproduced browser behavior. Runtime changes require separate approval. Production adapters, retroactive approval revocation and stale reviewed-draft refresh remain open dependencies.

## Acceptance and evidence

R01–R14, P19 and E03/E09 map assigned scope, all membership/order branches, fresh Check, preview-only behavior, exact approval, stale/replay/CAS/failure/history and own projection in the [acceptance plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md). Executable cases remain Planned/Not run pending C3.

The [workspace receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29) separates 29Oct builds and bounded HTTP observations, user-confirmed Move/Remove happy-case UI, conditional source gaps and unverified security/concurrency/browser cases. Historical revision11 is not a current-state claim.

Status: Confirmed.
