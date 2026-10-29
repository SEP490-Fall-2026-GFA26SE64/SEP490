# Exclude Pathway Module

**Function:** REQ-020-F02. **Actor:** assigned Expert. **Contract updated:** 2026-10-29.
Business requirements: [FR-05.07](../../../features/Pathway%20review/README.md#fr-05-07).

## Goal and preconditions

Remove an Included module from the draft's selected set while retaining an explicit exclusion and optional reason. Exclude differs from neutral Remove: Excluded membership records the Expert's exclusion; Remove clears membership and returns a still-eligible module to Catalog. Neither deletes catalog modules, audit or history, proves mastery, nor grants learning access.

Require trusted active Expert/org/entitlement/assignment and current AWAITING_EXPERT_REVIEW proposal with exact expected revision/hash. An unresolved draft is editable. Approved/archive, Employee overrides and generation failures without a draft are outside this command.

## Input and output

POST `/api/v1/expert/initial-pathways/{id}/exclusions`: opaque pathway ID, moduleId, expectedRevision, expectedContentHash, optional reason <=2000 characters, Idempotency-Key. Server owns actor/tenant/learner/assignment, selected set/order, eligibility, validation and history. Reject unknown client properties or client-owned mastery/approval/order.

Return pathwayId, resulting revision/revisionContentHash, reviewStatus, validationStatus and diagnostics as the retained outcome. Authorized detail retains warnings, dependency/coverage reasons and latest excluded membership/reason, without assessment keys/theta/SE or foreign data.

## Ordered flow

1. Authorize current assigned Expert before existence/receipt reads. Validate body/key. Reauthorize exact accepted replay before current-revision checks; same key with different body conflicts.
2. For a new command, check current editable revision/hash. If module is absent, return a safe no-op after current selection/binding/assignment checks, with receipt but no new exclusion/revision. Catalog→Excluded preemptive bans are not supported.
3. For a selected module, resolve fresh pinned problem and remove exactly that module. Append EXCLUDE/reason; do not auto-replace or re-add it.
4. Validate the fixed remaining set with global Primary/fallback eligibility, all affected skill prerequisites, provider assignments, external evidence, internal gate definitions and source versions. A selected Primary's removal does not prove that all usable Primary options are unavailable. Recompute distinct totals, per-pair coverage/benefit, diagnostics and separate advisory warnings.
5. Preserve explicit Expert relative order wherever dependencies permit. Provider reassignment may require dependency-valid repair of that order; Check/preview/confirmation subsequently retain the saved result.
6. Persist VALID if complete and proved, otherwise an editable UNRESOLVED draft with missing-provider/prerequisite/gate/cycle/search reasons. A valid warning-bearing fixed set is permitted. Include may later repair; Exclude never fabricates mastery/PASS to fill the hole.
7. Under learner coordination, recheck receipt/expected revision/current selection/binding/assignment; atomically save immutable revision/ordinals/teaching/dependencies, override, pointer CAS, receipt and audit/outbox.
8. Reconcile detail and fresh Check. Only a separate exact final confirmation can approve a repaired valid draft.

## Alternative, error and recovery flows

Included→Excluded cross-list drop and Exclude button invoke the same command. Excluded→Included invokes REQ-020-F01, while trash invokes REMOVE, retaining prior exclusion history. The latest per-module override plus selected membership determines panels; no localStorage authority or duplicate membership is allowed.

Reject stale/external/same-list drag payloads and disable mutation during busy/uncertain outcome, preview and approved/archive. Optional reason remains optional. 400 invalid command; 401/403/safe404 for scope; 409 stale revision/hash/selection or key conflict; 503 dependency/transaction failure. Failed writes leave no partial revision, receipt or exclusion; unknown outcome reuses the same key/body and reconciles current GET. A historic successful replay cannot mutate or approve newer content.

## Storage, compatibility and acceptance

InitialPathwayReview.edit/mutate, InitialReviewOrder and JdbcInitialRevisions implement this command at cced745. PostgreSQL owns immutable review state/history; Neo4j catalog is not mutated. Applied V35 widens only action CHECK; format1/2 histories and exact hashes remain readable. Rollback disables writes while retaining schema/readers/history, not deletion or CHECK narrowing.

R01/R05–R14 and P19 in the [test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md) cover provider/benefit removal, unresolved denial/Include repair, valid relative order, Exclude versus neutral Remove, no-op/replay/CAS, authorization/isolation/failure/history and no learning unlock. [Evidence](../../../testing/system/REQ-002-041-042-workspace-integration.md) records limited HTTP observations and user happy-case UI separately; executable coverage remains Not run. Production assignment/content/readiness and later recalculation remain owner dependencies in the [shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md).

Status: Confirmed.
