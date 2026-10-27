# Choose Target Role

**Function:** REQ-001-F02. **Actor:** Employee.

## Goal and context

Commit one authorized desired Role immediately, then evaluate the Occupation baseline next step. Baseline-entry selection does not wait for baseline readiness and does not start an assessment or calculate gaps. The selection command itself does not execute the planner; the separate explicit initial-pathway confirmation handoff below owns generation intent. [Unified contract](Role%20Selection%20and%20Occupation%20Baseline.md).

Trusted server context supplies active Employee/organization. Updated UI sends `roleId`, `levelId`, `expectedCurrentSelectionId` (explicit null on initial choice) and Idempotency-Key. Each Role+Level is a distinct effective target. Actor/tenant, snapshot, timestamps, revisions and validated membership are server-owned. Legacy role-only baseline requests/receipts remain compatible, without guessing a Level; all new pathway confirmation requires the pair. Current catalog IDs remain strings.

## Initial pathway confirmation handoff — 2026-10-27

User-confirmed amendment: Employee chooses Role then Level, reads own gaps from that exact Level's requirements against the valid stored baseline/profile, then explicitly confirms the pair for the initial pathway. Preview has no selection/archive/generation effects; browsing or a bare selection is not generation authorization. Changing Level on the same Role is a target change; choosing the same pair is a selection no-op.

The [planned confirmation/API design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#4-ordered-read-compute-and-write-pipeline) reuses this owner's serialization, replay, expected selection/revision and lifecycle guards. It adds expected gap input identity and durable generation intent; no competing selection handler, client-supplied mastery or guessed Level. A genuine existing baseline remains usable with new catalog skills represented UNKNOWN; no new baseline allowance. Initial Role-first baseline entry remains supported.

Selection snapshot is server-owned. C2 uses the same selection transaction and separate initial receipts; V25 role_snapshot new writes use a versioned wrapper holding catalog Role + selected levelId. Legacy unwrapped Role snapshots/receipts retain unknown Level and are not backfilled. No new migration is needed for the JSON format; V27 remains required/unapplied for pathway archive/storage. Same pair may be explicitly confirmed for first planning without changing selection revision; a Level change uses the existing guard/archive/history lifecycle. Later asynchronous failure retains the accepted selection. [Amendment/deployment limits](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#12-confirmed-amendment--employee-selects-role--level) apply; no DB transaction was executed here.

Preview gapInputHash and expected current selection are separate preconditions. After a different Role is committed, planningInputHash binds the resulting selection ID/revision; a successful choice must not become stale merely because it replaced the preview's current selection. Exact accepted confirmation replay reauthorizes and returns its receipt before evaluating new-command selection preconditions, then GET reconciles current state. BusinessRole-to-current-string-ID mapping is an owner dependency, not permission to activate legacy UUID routing or match Role names.

G01–G03/G11–G12/P01/P12 in the [new test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md) cover the added boundary, all Planned/Not run. Earlier selection evidence remains its original scope.

## Ordered operations

1. Authorize; serialize with assessment-start coordination for this learner, then lock learner state.
2. Resolve exact actor/key/hash replay; key reuse with another body conflicts. Reauthorize retained outcomes.
3. Recheck expected selection and current catalog visibility/unique Occupation ownership. Initial selection cannot overwrite another current choice.
4. Same Role is a no-op with replayable outcome. A different Role is blocked during an active assessment. Consult assessment/pathway lifecycle ports; unavailable dependencies fail without changes.
5. End the previous row and create the new immutable display snapshot and next target revision; archive the old pathway through its owning port. Commit selection, receipt, audit and outbox in one PostgreSQL transaction.
6. Return committed selection. Read next-step coverage afterward. If that read fails, retain selection and retry GET; never resend a new selection because reconciliation failed.

At most one active selection per Employee. Concurrent/stale requests cannot silently overwrite a winner. Evidence, mastery, prior attempts, snapshots and pathway history are preserved. Neo4j is read-only catalog authority; PostgreSQL owns selection and history.

## Output and events

Return selection ID, Role/Occupation display snapshot, nullable selected levelId (null only for legacy/unbound selections), selected time and target revision. No mastery/readiness/answer data belongs in this snapshot. Current selection/next-step reads are read-only. `PUT /api/v1/employee/target-role-selection` remains the one command boundary; GET reads its committed state. Existing outbox envelopes gain optional levelId/previousLevelId; event types and old receipt hash remain compatible for legacy requests.

Audit/outbox actions are TARGET_ROLE_SELECTED / TARGET_ROLE_CHANGED, with trusted learner aggregate, committed target revision and correlation identity. Preserve the existing versioned event envelope: organizationId, learnerId, selectionId, previousSelectionId, roleId, targetRevision and occurredAt. Outbox storage does not certify notification or downstream delivery.

## Errors and recovery

| Condition | Outcome; changes |
| --- | --- |
| Missing identity/forbidden | 401/403; none |
| Unavailable/invalid/foreign Role | Safe 404; none |
| Invalid input/key | 400; none |
| Key/body mismatch, stale expected selection or competing command | 409; none |
| Assessment in progress | 409; preserve selection/pathway and offer resume |
| Catalog/activity/pathway dependency unavailable | 503; rollback all writes |
| Unknown write outcome | Retain exact key/body and retry; after known success reconcile reads only |

Pending UI commands block double submission and retain exact retry identity. Browser navigation can interrupt a pending command; it must not trigger an automatic alternative selection. Confirm initial versus replacement actions with appropriate copy.

## Acceptance and dependencies

RB03–RB05/RB09/RB11–RB13/RB16–RB17 in the [acceptance plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md) cover replay/no-op, revision, tenant/actor boundaries, transactional rollback, races, blocked changes and no-write reads. Identity, catalog publication/references, activity and pathway lifecycle are owner dependencies; [implementation alignment](../../testing/system/REQ-001-002-final-synchronization-review.md) records their actual state without changing this contract.

Confirmed | Open: cross-owner production integration.
