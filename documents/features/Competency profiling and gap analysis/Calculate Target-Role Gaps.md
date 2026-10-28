# Calculate Target-Role Gaps

**Function:** REQ-041-F02. **Performer:** System for an authenticated Employee. **Status:** Cluster2 source implemented; Role-Level/publication/compatibility integration and runtime acceptance incomplete. Business rules confirmed27/10/2026.

## Current Scope Alignment

Explain learning needs for the Employee's explicitly selected Role + Level. Three Levels of one Role are three effective targets; requiredScore is taken from that exact Level–Skill edge. Preview never selects/archives/generates or changes mastery. [Current amendment and shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#12-confirmed-amendment--employee-selects-role--level) govern the revised selection contract. REQ-042-F01 remains a dependency.

Example: SQL required0.75/conservative mastery0.60→gap0.15; Modeling required0.70/mastery0.80→0; new required Quality without compatible evidence→UNKNOWN/null numeric gap, foundational learning need. No values are production seed truth.

## Actor, trusted input and output

Trusted active Employee/organization authorizes before reads. Client supplies roleId + levelId, never arbitrary learner/org, requiredScore, mastery, confidence or source versions. Server verifies membership/visibility/publication, reads exact decimal Level requirements and immutable baseline evidence. The internal effective-choice ID is server-derived from the pair; no separate enterprise mapping or guessed Level is required.

Output is own Role/Level refs, gapInputHash/source versions, expected current selection ID/revision separately, mandatory/optional skill requirements, known conservative mastery/confidence or UNKNOWN reason, numeric gap or null, and aggregate LEARNING_REQUIRED/NO_LEARNING_REQUIRED. No answer keys, theta/SE, another Employee's evidence or assessor-only material. Preview is read-only; confirmed snapshot persistence belongs to the confirmation transaction. The hash identifies calculation sources, not the future selection ID; the resulting selection is bound by planningInputHash after confirmation as shared design section5.1 proposes.

## Ordered reads and rules

1. Authorize Employee/catalog visibility; validate the selected Level belongs to exactly one selected Role/Occupation. Nonmember/foreign/ambiguous/unpublished or invalid mandatory requirements deny; no highest-Level inference.
2. Read applicable initialized profile/baseline origin and compatibility facts. No valid profile→baseline prerequisite under existing rules. Old completed baseline is neither rescored nor reopened for catalog additions.
3. Verify snapshot completeness/version consistency and evidence semantics. A skill genuinely absent or incompatible is UNKNOWN; missing expected original evidence due to integrity/read failure is unavailable, not UNKNOWN.
4. For known skill use stored conservative mastery logistic(theta-k×SE), original mapping/model; gap=max(0,requiredScore-mastery). Compare normalized decimals, round display only. Equality→0. Confidence is explanatory; no additional LOW gate/penalty.
5. Mandatory skills independently determine needs, with no average or cross-skill compensation. Optional rows are reference-only. UNKNOWN mandatory skill needs foundational instruction, without fabricated mastery0 or numeric gap.
6. Aggregate: all mandatory skills known/gap0→NO_LEARNING_REQUIRED; any positive gap or mandatory UNKNOWN→LEARNING_REQUIRED; no mandatory requirements→invalid configuration. These are planning estimates, not Level certification/readiness PASS.
7. Return preview/source hash with no learner writes. At confirmation re-read/revalidate versions; snapshot exact calculation atomically with durable request under planned orchestration. Same frozen input/policy reuses a result; stale results cannot feed F01.

Prerequisite is catalog dependency metadata for F01; it does not add skills to the Role's mandatory attainment set. F02 never converts skill mastery into prerequisite readiness PASS. Profile after learning, BKT and REQ-043 are outside scope.

## Authorization, failure and recovery

Cross-actor/tenant reads deny safely. Missing baseline is distinct from a corrupt profile, missing publication and graph outage. Empty malformed requirements never imply success. Dependency errors→unavailable/retry without partial calculation or persisted success. Stale source→conflict/refresh; no silent requirement update in a historical snapshot. Exact replay and concurrent confirmation use server input identity, not client-supplied mastery.

Current source profile stores original skills/attempt pins; UNKNOWN projections do not mutate it. Catalog0.11 focus/difficulty does not enter gap arithmetic or change mastery. Preserve exact local v08/v010 eligibility-fingerprint support when adding reviewed v011 compatibility; equal skill IDs alone are insufficient and an unsupported origin fails safely. No-state-change preview includes audit-free learner state; operational logging is not learning history mutation.

## Acceptance-to-test mapping

| Rule | Required observable outcome |
| --- | --- |
| G01–G03 | Own explicit Role-Level binding; foreign/ambiguous/unpublished deny; preview no selection/pathway mutation |
| G04–G07 | Formula/equality/confidence; no mandatory compensation; optional reference-only; UNKNOWN/null vs data failure |
| G08–G10 | New skill without baseline retake; no-gap/empty mandatory; original history/allowance retained |
| G11–G12 | Separate gap/selection/planning identity, coherent source reads, stale/concurrent/exact receipt replay and dependency failure without partial success |
| G13 | Recognized historical v08/v010 profile reused against reviewed v011 only with unchanged skill semantics; exact mastery/pins retained, unsupported source denied, no reset/retake/rescore/repin |

[Test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md). Executable acceptance remains Planned/Not run. Gap domain, scoped original-profile reader, no-write endpoint and explicit-confirm UI exist in C2 source; default owner adapters deny missing binding/publication/compatibility. [Actual checks/limits](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27) distinguish compilation from runtime proof.

Confirmed: unchanged gap rules/compatibility preservation | Source updated/built2026-10-28: local0.11 compatibility retaining v08/v010 | Open: actual profile/hash round-trip, production publication/semantic adapters and runtime evidence | Rejected: mastery rewrite/reset or tests without C3.

## Confirmed local Compose amendment ? 2026-10-28

[Shared design18](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) supersedes earlier missing-planner-input labels for the explicitly gated local demo once implemented. Fixed seed availability and original compatible mastery/UNKNOWN drive planning-only prerequisite decisions; no assessment PASS/internal gate is fabricated. Main dev Compose and FE rule review are approved C2 scope. Production owner adapters and executable acceptance remain Open/Not run.
