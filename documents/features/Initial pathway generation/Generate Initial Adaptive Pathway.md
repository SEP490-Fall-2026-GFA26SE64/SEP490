# Generate Initial Adaptive Pathway

**Function:** REQ-042-F01. **Performer:** System. **Status:** C1 confirmed;0.11 C2 policy/optimizer/format source updated and built2026-10-28. Owner access/SQL/runtime acceptance incomplete.

## Current Scope Alignment

After explicit Employee Role confirmation using current F02 input, build an explained unique ordered Module proposal for Expert review. [Flow/API/data design](Initial%20Pathway%20Flow%20and%20Data%20Design.md) defines trusted DTOs, snapshots, proposed persistence and error codes; [diagram](../../diagrams/gap-pathway-initial-flow.md) shows initial lifecycle. Viewing gap alone never requests generation. Generation never unlocks Employee learning.

## Actor, trigger and contract

Trusted Employee/org enters confirmation; asynchronous worker uses trusted stored tenant/aggregate context, not arbitrary event/client IDs. Server input: explicitly selected catalog TargetRole+member Level, current selection/revision, F02 snapshot, baseline profile origin/hash, catalog/publication/semantic/suitability/readiness versions and algorithm/policy identity. Prerequisite-only learning needs carry their own trusted mastery/UNKNOWN/provenance through ports. Client cannot supply preferred modules, rank, mastery or success state.

Output: durable request status; then a proven-best generated proposal/revision/hash under the confirmed objective, with unique ordered Module/content versions, per-skill teachingFocus/difficultyLevel/coverage assignments, reasons, separate fallback warnings and blocking errors, quality/totals, search proof metadata, dependencies and frozen source refs. Only authorized Expert receives permitted candidate/evidence detail. Employee initially sees generating/review/unresolved/no-gap status; no protected question data or draft learning links.

## Ordered algorithm

1. Claim/replay confirmed request; reauthorize input availability/current selection through scoped ports. Missing valid F02 input never starts a successful plan.
2. NO_LEARNING_REQUIRED yields a durable no-gap outcome, not empty pathway/completion or mandatory Expert approval. Optional acknowledgement UX remains Proposed. Otherwise collect mandatory numeric deficits and mandatory UNKNOWN; optional gaps remain reference-only.
3. Batch-read only related skill/prerequisite closure/providers and metadata from Neo4j. Direction A→HAS_SKILL_PREREQUISITE→P means P needed before A. Dedup shared nodes/edges/module mappings; do not enumerate all paths or issue one remote call per skill by default.
4. Filter actual publication/access/content-version/suitability/required readiness mappings. Read TEACHES.teachingFocus=PRIMARY/SUPPORTING/INCIDENTAL and difficultyLevel=LOW/MEDIUM/HIGH independently per pair. Validate all teaching links of candidate Modules, including exactly one Primary, with bounded batched reads. Legacy instructionLevel/OC is not a current fallback.
5. After need eligibility, use exact stored mastery:3m<1 LOW, else3m<2 MEDIUM, else HIGH; UNKNOWN prefers LOW with original null evidence/reason, never0. Known gap0 has no provider. PRIMARY fulfills needs; SUPPORTING is benefit unless no usable Primary-backed feasible option exists across all difficulties; INCIDENTAL never counts. Difficulty fallback orders and warnings follow [section14.1](Initial%20Pathway%20Flow%20and%20Data%20Design.md#141-need-focus-and-difficulty). Missing policy/configuration blocks safely.
6. Compare **whole feasible pathways** lexically by Supporting-coverage fallback count, difficulty rank2 count, rank1 count, unique total minutes, unique total VND, descending distinct suitable Supporting-beneficiary skills, module count and stable IDs/assignments. Mandatory feasibility comes first. A shorter fallback cannot beat better quality; Supporting benefit does not remove another skill's Primary. Do not infer fixed mastery gains or prescribe all three difficulties.
7. Build selected Module dependency graph and topological order. Same Module teaching prerequisite/dependent requires explicit internal sequence/gate; no silently removed self-dependency. Selected cycle/infeasible order must retry selection or become unresolved.
8. Validate full mandatory learning-plan coverage, readiness dependencies, dedup and freshness; deterministic bounded exhaustive/branch-and-bound search must prove the best objective before generation publication. Do not stop at first valid or truncate to5/top-k Modules. Budget exhaustion is SEARCH_LIMIT/NOT_PROVEN with no successful/current valid proposal, even if an internal feasible incumbent exists. No false Primary-unavailability conclusion from an outage or limit.
9. Under short tenant/learner coordination, revalidate current input then atomically save run/proposal revision/content hash/targets/dependencies/audit/outbox. Stale work stays historical and cannot become current. Proposal ready→AWAITING_EXPERT_REVIEW; computing→GENERATING. No graph writes or distributed ACID assumed.

Readiness PASS requires valid version-matched evidence. Not-yet-PASS can create foundation/readiness learning steps if mapping exists; it does not block producing an explicitly gated valid proposal by itself. Missing required mapping/content→PATHWAY_UNRESOLVED. Actual assessment execution/mastery updates are later Functions.

## Replay, errors and recovery

Exact scope/input+policy+algorithm identity reuses effective result, even after client/worker retry. Same command key/different body→409; concurrent writers use CAS/uniqueness; failed commit never exposes partial success. Selection/input drift prevents handoff, not learner history deletion. Transient graph/PostgreSQL outage→retryable state; missing provider/cycle→unresolved, not outage. Bounds/retry/lease values remain technical Proposed/Open; old arbitrary5s/candidate caps are not accepted requirements.

Keep request receipts/frozen provenance/old proposals on failure or Role change. Review already started is not overwritten by regenerated work; stale review needs explicit refresh. Full REQ-043/post-learning recalculation/AI regeneration/reordering are outside this Function.

Shared design sections5.1–5.2 separate gapInputHash from resulting-selection planningInputHash and generation/review/validation projections. Persisted computation success does not keep polling in awaiting-review after approval. Only the current worker claim token may commit; an expired claimant cannot overwrite recovery. Exact accepted replay returns its receipt, while a new stale command conflicts. Mixed catalog batches/version labels without a coherent owner snapshot are not valid frozen input.

An initial UNRESOLVED/BLOCKED run may have no editable proposal. Owner data/policy remediation precedes retry; changed input needs fresh preview/explicit confirmation. An existing Expert draft made invalid by exclusion remains repairable via include. Stale reviewed-draft refresh/retry-exhaustion interfaces remain Open, with no silent regeneration.

## Implementation alignment and acceptance

Base5b17c77 had instructionLevel/0.10/first-feasible behavior; current uncommitted source implements the new pair mapper, policy and bounded whole-path proof/objective with fixed-set review. V28 source/format2 codec/JDBC preserve V27, old labels/hashes and v08/v010 compatibility while adding0.11. Nothing is migrated/deployed here. [Current source/build receipt](../../testing/system/REQ-041-042-v011-source-build.md) is separate from dated old-machine V27/preview200 evidence; actual optimizer/hash/SQL correctness and full flow remain unverified.

P01–P20 in the [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md) cover trigger/no-gap, batched closure/full pair metadata, exact bands/focus/fallback/whole-path objective, prerequisite/dedup/order, proof/limits, legacy format/hash, runtime versions and replay/stale/fencing/atomicity. All executable evidence Planned/Not run. Today's source/build milestone excludes deferred manual/UI acceptance on the DB-capable machine; safe503 is not integration success.

Confirmed: goal/0.11 policy/objective/search/invariants | Source implemented/built: C2 adaptation/V28 source/format2 | Open: owner readiness/content/production integration, configured runtime and executable proof | Rejected: partial/first-valid success, fake mastery/automatic learning or tests without C3.
