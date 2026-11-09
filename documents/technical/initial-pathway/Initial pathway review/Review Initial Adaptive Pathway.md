# Review Initial Requirement Pathway

REQ-019-F01 and REQ-020-F01/F02; currently assigned Expert.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal, position and preconditions

RequirementPathwayReviewService requires current same-tenant Expert assignment before protected reads/actions. Check/save selection uses expected revision/contentHash and exact step/module/revision/contentVersion keys. It must cover editable steps, validates fresh candidates and retains started options. Current order edits only unstarted nonfulfilled/nonbypassed/nondependency-bound positions. Check is read-only; saved changes produce new immutable revision/override history and replay receipt.

Approval rechecks exact valid revision, selection and actual assignment and records genuine Expert/hash/time. Automatic valid supplementation retains approval lineage; it does not invent an Expert. Missing provision remains explicit. Scoped bypass uses actual Expert/assignment/reason/history and never achievement. Current code allows bypass of unresolved REQUIRED work even with available provision; certificate decision remains separately assigned and version-bound.

Confirmed on 2026-11-08: generation attaches all eligible alternatives; assigned Role Expert may remove some during review. One qualifying completed module plus passing Skill Assessment fulfils the requirement; other eligible modules remain voluntary. Code confirmation remains pending. No standalone inclusions/exclusions/neutral removal endpoint is mounted by the active rule controller.

## Ordered read, Check and preview flow

Assigned queue/detail → fresh validation/candidates/provenance → read-only module-selection/check → save module-selection with Idempotency-Key and expected revision/hash → inspect exact new revision → confirmation. Bypasses/refresh are separate reasoned actions. Preview never approves or starts learning.

## Storage, compatibility and implementation alignment

PostgreSQL existing initial revision/current/approval/override/receipt plus V54 requirement tables and V61 multi-module override uniqueness. Neo4j provides exact catalog; no graph learner progress. Older numeric per-module inclusion/move routes are demo-only history.

## Errors and recovery

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="confirmed-expert-order-and-neutral-removal--2026-10-29"></a>
<a id="fields-and-read-projection"></a>
<a id="adjacent-ordering-and-neutral-removal"></a>
<a id="mutation-concurrency-and-final-approval"></a>
<a id="acceptance-and-evidence"></a>

Historical references retained: REQ-019-F01, REQ-042-F01, REQ-020-F01, REQ-004-F01, REQ-041, REQ-002. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[acceptance plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)

[workspace receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29)
