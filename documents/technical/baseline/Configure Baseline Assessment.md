# Configure Baseline Assessment

REQ-002-F02; L&D configuration, with separate Expert Skill policy boundary.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal and position

L&D configures Baseline per organization and Role; selected Level determines Employee groups. Expert manages Skill Assessment within assigned Role/Skill authority. The common editor activates settings only for the Expert's currently assigned Roles. The same Skill uses separate settings in different Roles.

Draft and active settings can coexist. Configure question/passing counts, seconds per question, attempts and wait. Skill Assessment adds mandatory quotas and prerequisite rules. Required questions must be Published and sufficient; missing bank blocks the affected operation.

## Ordered reads and writes

Recheck membership, entitlement and assignment. Save draft keeps progress. Save & Activate saves then activates that revision; retry repeats only the failed stage. Conflicting changes require reload; existing versions and papers remain intact.

## API and UI

AssessmentPolicyController: /api/v1/assessment-policies/{purpose}/scopes, /{key}, draft/editor/activation/completion/abandonment. L&D baseline route and Expert /expert/skill-assessment-config use existing design; baseline-only operations reject Skill purpose. No active rule deactivate/restore endpoint.

## Failure and recovery

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="actor-context-source-and-input-ownership"></a>
<a id="configuration-and-form-contract"></a>
<a id="list-lifecycle-and-presentation"></a>
<a id="outputs-failure-and-recovery"></a>
<a id="planned-catalog-source-alignment--revision19"></a>
<a id="version-identity-and-draft-discard"></a>
<a id="compatibility-acceptance-and-alignment"></a>
<a id="organization-assessment-policy--planned"></a>
<a id="confirmed-activation-prerequisite-2026-11-01"></a>

Historical references retained: REQ-002-F02, REQ-002, REQ-001. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[CA19-06–08](../../testing/REQ-002-adaptive-baseline-test-plan.md#authored-catalog-alignment--revision19)

[adaptive plan](../../testing/REQ-002-adaptive-baseline-test-plan.md)

[Role-to-baseline plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md)

[Implementation/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md)

[AP01–AP09](../../testing/REQ-002-adaptive-baseline-test-plan.md#organization-policy-and-calibration-amendment--2026-11-01)
