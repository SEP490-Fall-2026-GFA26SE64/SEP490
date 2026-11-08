# Exclude a requirement module option — source-policy boundary

REQ-020-F02; assigned Expert. Exclusion never waives the requirement.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal and preconditions

RequirementPathwayReviewService requires current same-tenant Expert assignment before protected reads/actions. Check/save selection uses expected revision/contentHash and exact step/module/revision/contentVersion keys. It must cover editable steps, validates fresh candidates and retains started options. Current order edits only unstarted nonfulfilled/nonbypassed/nondependency-bound positions. Check is read-only; saved changes produce new immutable revision/override history and replay receipt.

Approval rechecks exact valid revision, selection and actual assignment and records genuine Expert/hash/time. Automatic valid supplementation retains approval lineage; it does not invent an Expert. Missing provision remains explicit. Scoped bypass uses actual Expert/assignment/reason/history and never achievement. Current code allows bypass of unresolved REQUIRED work even with available provision; certificate decision remains separately assigned and version-bound.

Confirmed on 2026-11-08: generation attaches all eligible alternatives; assigned Role Expert may remove some during review. One qualifying completed module plus passing Skill Assessment fulfils the requirement; other eligible modules remain voluntary. Code confirmation remains pending. No standalone inclusions/exclusions/neutral removal endpoint is mounted by the active rule controller.

## Input and output

Use the same module-selection/check and module-selection aggregate command as Include; omit the unstarted option from that step. No active /exclusions or neutral Remove endpoint. Empty module-only options produce NEEDS_EXPERT_ACTION; started option exclusion is rejected.

## Ordered flow

Current selectedPlan validates exact candidate membership, all editable steps and fixed order positions; save records immutable override/source history. Expert option reduction is confirmed on 2026-11-08; this does not delete the step, weaken completion requirements or erase prior progress. Actual access and review guards still require code confirmation.

## Alternative, error and recovery flows

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="storage-compatibility-and-acceptance"></a>

Historical references retained: REQ-020-F02, REQ-020-F01, REQ-041, REQ-002. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)

[Evidence](../../../testing/system/REQ-002-041-042-workspace-integration.md)
