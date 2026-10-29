# Choose Target Role

## Confirmed Employee UI refinement — 2026-10-28

User approved five screenshot-based changes plus alignment with FE AGENTS/live tokens: always-visible accessible Level options (no dropdown), a larger viewport-bounded selection/gap/detail dialog, original portal menu with one fixed demo Employee, removal of catalog scope text/selection timestamp from the Active Role summary, and an always-visible summary with a standard Review skill gap button instead of a collapse arrow. That button opens the exact selected Role+member Level preview; legacy unbound Level still requires an explicit choice. Level changes remain preview-only until the existing confirmation command. No selection/profile/history/hash change from opening or resizing UI.

Selected/highlight/hover/focus uses primary/secondary brand semantics; success/warning/destructive remain outcome semantics. Popup content may grow to the available viewport and remains scrollable by pointer/touch/keyboard with hidden scrollbars; header/footer/close remain reachable, no nested Level popup. Keep shared Dialog/body/component and current typography/font. Single local Employee is existing server alias employee-a; remove B/C shortcuts and stop offering/provisioning them as new demo personas, retaining persisted historical accounts/results until a separately requested dev-volume reset. Expert/L&D/admin session switching and trusted tenant/grants remain. Expert drag/drop changes and volume deletion are outside this refinement.

Acceptance mapping: RB03–RB05/RB09/RB11–RB13/RB16–RB17 and G01–G03/G11/G12; plan keyboard Level selection, exact selected-pair popup defaults, no-write opening/preview, command/retry/disabled handling, one-Employee server persona allowlist, responsive overflow/hidden-scroll access, EN/VI and semantic highlights. C2 build/type/lint and bounded manual reads only; executable cases require separate C3 approval. Confirmed | Open: actual browser observations | Rejected: client authority, automatic learner reset, auto-selecting a missing Level or unsaved target changes.

**Function:** REQ-001-F02. **Actor:** Employee.

## Goal and context

Commit one authorized desired Role immediately, then evaluate the Occupation baseline next step. Baseline-entry selection does not wait for baseline readiness and does not start an assessment or calculate gaps. The selection command itself does not execute the planner; the separate explicit initial-pathway confirmation handoff below owns generation intent. [Unified contract](../../baseline/Role%20Selection%20and%20Occupation%20Baseline.md).

Trusted server context supplies active Employee/organization. Updated UI sends `roleId`, `levelId`, `expectedCurrentSelectionId` (explicit null on initial choice) and Idempotency-Key. Each Role+Level is a distinct effective target. Actor/tenant, snapshot, timestamps, revisions and validated membership are server-owned. Legacy role-only baseline requests/receipts remain compatible, without guessing a Level; all new pathway confirmation requires the pair. Current catalog IDs remain strings.

## Initial pathway confirmation handoff — 2026-10-27

User-confirmed amendment: Employee chooses Role then Level, reads own gaps from that exact Level's requirements against the valid stored baseline/profile, then explicitly confirms the pair for the initial pathway. Preview has no selection/archive/generation effects; browsing or a bare selection is not generation authorization. Changing Level on the same Role is a target change; choosing the same pair is a selection no-op.

The [planned confirmation/API design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#4-ordered-read-compute-and-write-pipeline) reuses this owner's serialization, replay, expected selection/revision and lifecycle guards. It adds expected gap input identity and durable generation intent; no competing selection handler, client-supplied mastery or guessed Level. A genuine existing baseline remains usable with new catalog skills represented UNKNOWN; no new baseline allowance. Initial Role-first baseline entry remains supported.

Selection snapshot is server-owned. C2 reuses the selection transaction and separate initial receipts; V25 role_snapshot writes use a versioned Role+selected levelId wrapper. Legacy unwrapped snapshots/receipts retain unknown Level without backfill. That wrapper requires no new migration; V27 is required for archive/storage and was applied only in dated old-machine evidence, not verified on today's external DB. The planned0.11 revision-format migration is a separate pathway dependency. Same pair may be confirmed for first planning without a selection revision change; Level change retains assessment/archive guards. Later generation failure retains selection. [Current contract/environment](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#14-confirmed-catalog011-policy-and-implementation-contract--2026-10-28) governs; no DB action occurs in C1.

Preview gapInputHash and expected selection are separate preconditions. After a different Role is committed, planningInputHash binds the resulting selection ID/revision; replacement itself cannot make the command stale. Exact replay reauthorizes and returns its retained receipt before new-command selection checks; GET reconciles afterward. The server derives effective-choice identity from explicit string Role+Level; no separate guessed business mapping, legacy UUID routing or name matching is introduced. New planning versions include confirmed focus/difficulty policy; the client cannot supply them.

G01–G03/G11–G12/P01/P12 in the [new test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md) cover the added boundary, all Planned/Not run. Earlier selection evidence remains its original scope.

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

RB03–RB05/RB09/RB11–RB13/RB16–RB17 in the [acceptance plan](../../../testing/REQ-001-002-role-baseline-flow-test-plan.md) cover replay/no-op, revision, tenant/actor boundaries, transactional rollback, races, blocked changes and no-write reads. Identity, catalog publication/references, activity and pathway lifecycle are owner dependencies; [implementation alignment](../../../testing/system/REQ-001-002-final-synchronization-review.md) records their actual state without changing this contract.

Confirmed | Open: cross-owner production integration.

## Confirmed local Compose amendment ? 2026-10-28

[Shared design18](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) supersedes earlier missing-planner-input labels for the explicitly gated local demo once implemented. Fixed seed availability and original compatible mastery/UNKNOWN drive planning-only prerequisite decisions; no assessment PASS/internal gate is fabricated. Main dev Compose and FE rule review are approved C2 scope. Production owner adapters and executable acceptance remain Open/Not run.
