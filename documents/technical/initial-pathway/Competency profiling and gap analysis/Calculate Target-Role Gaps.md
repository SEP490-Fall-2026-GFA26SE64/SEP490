# Calculate Target-Role Requirements and Needs

REQ-041-F02; trusted Employee reads own target requirements.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Current Scope Alignment

RuleKnowledgeProfileService and RuleAssessmentOutcomeService read PostgreSQL diagnostics/group results separately from official skill_knowledge_evidence and NEED_REVIEW. Baseline only creates diagnostics for actually assessed groups; a pass skips initial corresponding learning, never ACHIEVED or module completion. It does not create B solely from A prerequisite topology. No numeric gap subtraction, title exemption or lower-knowledge inheritance.

Official evidence requires exact org/learner/Skill/knowledge/Skill version/outcome coverage with accepted MODULE_ASSESSMENT or CERTIFICATE source. Bypass is a waiver, not achievement. Failed already-achieved prerequisite yields NEED_REVIEW without revocation; later genuine compatible evidence may resolve it. Result finalization differs from pending downstream processing; WAITING_REQUIRED_SUPPLEMENT is not a new scoring failure.

## Ordered reads and rules

RequirementPathwayAdmissionService.preview reads selected Role/Level/catalog, exact official evidence and latest finalized baseline only when selection/catalog/Skill version/outcomes match. Missing MODULE_ONLY diagnostics requires baseline; diagnostic pass skips that initial requirement. Certificate-only and missing provision remain needs. No unassessed prerequisite expansion or profile write. Return selection/revision/inputHash and baselineRequired/required/parallel context.

## Authorization, failure and recovery

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="actor-trusted-input-and-output"></a>
<a id="acceptance-to-test-mapping"></a>
<a id="confirmed-local-compose-amendment--2026-10-28"></a>

Historical references retained: REQ-041-F02, REQ-041, REQ-043. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[CA19-09–12](../../../testing/REQ-041-042-initial-pathway-test-plan.md#authored-catalog-alignment--revision19)

[Test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)
