# Generate Initial Adaptive Pathway

**Function:** REQ-042-F01. **Performer:** System. **Status:** Cluster2 source implemented; owner policies/coherent catalog/runtime evidence incomplete. Business pipeline confirmed27/10/2026.

## Current Scope Alignment

After explicit Employee Role confirmation using current F02 input, build an explained unique ordered Module proposal for Expert review. [Flow/API/data design](Initial%20Pathway%20Flow%20and%20Data%20Design.md) defines trusted DTOs, snapshots, proposed persistence and error codes; [diagram](../../diagrams/gap-pathway-initial-flow.md) shows initial lifecycle. Viewing gap alone never requests generation. Generation never unlocks Employee learning.

## Actor, trigger and contract

Trusted Employee/org enters confirmation; asynchronous worker uses trusted stored tenant/aggregate context, not arbitrary event/client IDs. Server input: explicit business Role→catalog TargetRole+Level, current selection/revision, F02 snapshot, baseline profile origin/hash, catalog/publication/semantic/suitability/readiness versions and algorithm/policy identity. Client cannot supply preferred modules, rank, mastery or success state.

Output: durable request status; then one effective proposal/revision/hash with ordered unique Module/content versions, target skills/instructionLevel/reasons, prerequisite/readiness dependencies, coverage diagnostics and frozen source refs. Only assigned Expert receives permitted candidate/evidence detail. Employee initially sees generating/review/unresolved/no-gap status. No protected question data.

## Ordered algorithm

1. Claim/replay confirmed request; reauthorize input availability/current selection through scoped ports. Missing valid F02 input never starts a successful plan.
2. NO_LEARNING_REQUIRED yields a durable no-gap outcome, not empty pathway/completion or mandatory Expert approval. Optional acknowledgement UX remains Proposed. Otherwise collect mandatory numeric deficits and mandatory UNKNOWN; optional gaps remain reference-only.
3. Batch-read only related skill/prerequisite closure/providers and metadata from Neo4j. Direction A→HAS_SKILL_PREREQUISITE→P means P needed before A. Dedup shared nodes/edges/module mappings; do not enumerate all paths or issue one remote call per skill by default.
4. Filter actual publication/access/content-version/suitability/required assessment mappings. Read TEACHES.instructionLevel exactly FOUNDATIONAL/INTERMEDIATE/ADVANCED from owner source, not numeric OC or name-based defaults.
5. Rank per skill by versioned suitable-depth preference, duration ascending, price ascending, stable Module ID. UNKNOWN needs foundational-suitable content. No approved mastery→depth numeric formula, maximum-enum rule or J/M/S mapping is inferred. Missing suitability policy→blocked, not invented rank.
6. Select across the whole pathway from ranked lists, accounting for matched target coverage, shared providers and prerequisite feasibility. Reuse Module once only for suitable targets. Infeasible top provider→deterministic feasible alternative or unresolved. This is not maximum-coverage-first or a claim of global time/price optimum.
7. Build selected Module dependency graph and topological order. Same Module teaching prerequisite/dependent requires explicit internal sequence/gate; no silently removed self-dependency. Selected cycle/infeasible order must retry selection or become unresolved.
8. Validate full mandatory learning-plan coverage, readiness dependencies, dedup, freshness and configured technical limits. Do not truncate to5 Modules; reaching a limit is explicit, never successful partial coverage.
9. Under short tenant/learner coordination, revalidate current input then atomically save run/proposal revision/content hash/targets/dependencies/audit/outbox. Stale work stays historical and cannot become current. Proposal ready→AWAITING_EXPERT_REVIEW; computing→GENERATING. No graph writes or distributed ACID assumed.

Readiness PASS requires valid version-matched evidence. Not-yet-PASS can create foundation/readiness learning steps if mapping exists; it does not block producing an explicitly gated valid proposal by itself. Missing required mapping/content→PATHWAY_UNRESOLVED. Actual assessment execution/mastery updates are later Functions.

## Replay, errors and recovery

Exact scope/input+policy+algorithm identity reuses effective result, even after client/worker retry. Same command key/different body→409; concurrent writers use CAS/uniqueness; failed commit never exposes partial success. Selection/input drift prevents handoff, not learner history deletion. Transient graph/PostgreSQL outage→retryable state; missing provider/cycle→unresolved, not outage. Bounds/retry/lease values remain technical Proposed/Open; old arbitrary5s/candidate caps are not accepted requirements.

Keep request receipts/frozen provenance/old proposals on failure or Role change. Review already started is not overwritten by regenerated work; stale review needs explicit refresh. Full REQ-043/post-learning recalculation/AI regeneration/reordering are outside this Function.

Shared design sections5.1–5.2 separate gapInputHash from resulting-selection planningInputHash and generation/review/validation projections. Persisted computation success does not keep polling in awaiting-review after approval. Only the current worker claim token may commit; an expired claimant cannot overwrite recovery. Exact accepted replay returns its receipt, while a new stale command conflicts. Mixed catalog batches/version labels without a coherent owner snapshot are not valid frozen input.

An initial UNRESOLVED/BLOCKED run may have no editable proposal. Owner data/policy remediation precedes retry; changed input needs fresh preview/explicit confirmation. An existing Expert draft made invalid by exclusion remains repairable via include. Stale reviewed-draft refresh/retry-exhaustion interfaces remain Open, with no silent regeneration.

## Implementation alignment and acceptance

Recommendation/pathway now contain C2 gap/planner/validation/application/JDBC/API/default-off dispatch source and an unapplied V27. Owner-backed published graph sessions, policy/assignment/readiness/content adapters remain missing; safe unavailable adapters cannot demonstrate generation success. Source instructionLevel0.10 review package exists but Compose remains0.9; no runtime upgrade asserted. V4 legacy FKs/rank1..5 are not reused. [Current checks/limits](Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27) record compile/build, not executable acceptance or live transaction proof.

P01–P14 in the [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md) cover trigger/no-gap; batched/transitive reads; filtering/depth/rank; multi-skill shared provider/alternative/ordering; missing/cycles/limits; replay/stale/atomic/outbox and no unlock before review. All new executable evidence Planned/Not run.

Confirmed: goal/pipeline/invariants | Source implemented: planner/storage/API/worker | Open: owner suitability/readiness/publication, operational values and runtime acceptance | Rejected: silent partial success/automatic learning.
