# Choose Target Role and member Level

REQ-001-F02; Employee. Both Role and actual Level form the target pair.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal and context

Trusted server session supplies Employee/org/entitlement. Client chooses published Role and actual member Level with expected selection identity and retry key. RoleBaselineFlow/CurrentRoleSelectionStore serialize through learner coordination. Same pair is a reauthorized no-op; changed pair checks active assessment and targetBound BEFORE archive/end/write. Selection alone creates no attempt/request.

Accepted RequirementPathwayAdmission confirmation pins selection revision and previewed input hash, stores exact requirements and immediately binds both fields. Pending generation/review/error remains bound for repair/retry. No required non-bypassed work and no active attempt permits replacement; exact compatible official evidence can exempt later baseline. Old bypass work retains original source as PARALLEL_SUPPLEMENT without gates on new target requirements.

## Ordered operations

Read current trusted choice/catalog, validate expected identity and authorized exact pair, replay accepted command or check active assessment/targetBound under learner lock, then write new selection/end old pointer/audit/outbox atomically. Preview/confirmation is a separate request with exact input hash; it does not silently reselect another pair.

## Output and events

Return selected snapshot/id/revision/time and availability/lock reasons. Target event/outbox is server-derived; historical receipt does not grant foreign/current unavailable catalog access. Failure after commit reading next-step does not undo selection.

## Errors and recovery

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="confirmed-employee-ui-refinement--2026-10-28"></a>
<a id="initial-pathway-confirmation-handoff--2026-10-27"></a>
<a id="acceptance-and-dependencies"></a>
<a id="confirmed-local-compose-amendment--2026-10-28"></a>

Historical references retained: REQ-001-F02, REQ-041, REQ-001. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[new test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)

[acceptance plan](../../../testing/REQ-001-002-role-baseline-flow-test-plan.md)

[implementation alignment](../../../testing/system/REQ-001-002-final-synchronization-review.md)
