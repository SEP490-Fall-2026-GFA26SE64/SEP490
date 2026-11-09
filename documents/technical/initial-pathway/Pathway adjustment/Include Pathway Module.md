# Include an eligible requirement module option

REQ-020-F01; assigned Expert, within requirement review.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal and preconditions

RequirementPathwayReviewService requires current same-tenant Expert assignment before protected reads/actions. Check/save selection uses expected revision/contentHash and exact step/module/revision/contentVersion keys. It must cover editable steps, validates fresh candidates and retains started options. Current order edits only unstarted nonfulfilled/nonbypassed/nondependency-bound positions. Check is read-only; saved changes produce new immutable revision/override history and replay receipt.

Approval rechecks exact valid revision, selection and actual assignment and records genuine Expert/hash/time. Automatic valid supplementation retains approval lineage; it does not invent an Expert. Missing provision remains explicit. Scoped bypass uses actual Expert/assignment/reason/history and never achievement. Current code allows bypass of unresolved REQUIRED work even with available provision; certificate decision remains separately assigned and version-bound.

Confirmed on 2026-11-08: generation attaches all eligible alternatives; assigned Role Expert may remove some during review. One qualifying completed module plus passing Skill Assessment fulfils the requirement; other eligible modules remain voluntary. Code confirmation remains pending. No standalone inclusions/exclusions/neutral removal endpoint is mounted by the active rule controller.

## Input, output and protected fields

Active command is POST /api/v1/expert/initial-pathways/{id}/module-selection with expected {revision,contentHash}, selections [{stepId,options:[{moduleId,moduleRevision,contentVersion}]}] and optional complete stepOrder. Precheck uses /module-selection/check. No active /inclusions route. Actor/org/eligibility/status/time come from server.

## Ordered flow

Reauthorize assignment and learner transaction; replay exact body or compare current editable tuple; validate all step keys/options against current candidates; prevent losing started choice; publish new immutable revision/INCLUDE/EXCLUDE history and receipt only if changed. Check/preview/confirmation follow separately.

## Alternative and failure flows

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="history-implementation-and-acceptance"></a>

Historical references retained: REQ-020-F01, REQ-019-F01, REQ-041, REQ-002. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)

[dated receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md)
