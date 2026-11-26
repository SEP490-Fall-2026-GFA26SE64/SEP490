# Experiment 3 Evidence driven pathway adaptation

Protocol version 0.3, 25 November 2026. **Status: pilot executed with runtime parity (run `20261125-r2-runtime-parity`, 100 profiles × 30 seeded replicates, budget 40, checkpoints 0/10/20/30/40). Not final: the simulator, rubric and prerequisite relations still await independent expert review, and the cohort manifest remains `DRAFT_PILOT_INPUTS`.** Numeric parameters below are frozen synthetic simulation settings, not calibrated human-learning estimates. Run `rq3-pilot100-20261125` (r1) is superseded because its A0 policy reimplemented supplementation inside the runner; it is kept only as history.

## Registered question and terminology

> Does dynamic pathway recalculation (Knowledge Tracing) result in a mathematically shorter distance to the Target Role profile compared to static predefined pathways?

The registered wording from [Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) remains unchanged. The evaluated artifact is the existing rule-and-evidence-based recalculation engine, not a probabilistic BKT model. “Knowledge Tracing” in the registered question is not evidence that Bayesian knowledge tracing has been implemented. Explain this operational boundary to the supervisor; conclusions apply to evidence-driven recalculation only. [Corbett and Anderson](RELATED_WORK.md) is a terminology reference, not a model implemented here.

## Population and fixed target

Simulate 100 Application Developer learners across Junior/Middle/Senior with reviewed target requirements and prerequisites. Proposed Level allocation is 34/33/33, frozen after catalog coverage review. Independently declare how initial knowledge/evidence states are generated; do not tune learners so adaptive always wins. Use synthetic IDs and version-compatible data; no real employee profiles.

For learner u, freeze target set T(u) of explicit Skill–knowledge–version requirements. External prerequisites may enter the pathway but not this target denominator. Define E(u,b) as official achievements at activity budget b. Primary distance:

`D(u,b) = |T(u) minus E(u,b)| / |T(u)|`.

T(u) must be nonempty. Baseline pass, bypass, ASSESSED_SATISFIED and content completion alone do not enter E. Pathway completion/release and D=0 are separate outcomes. Baseline-exempt profiles may finish a pathway while D remains positive; retain them as an explicit stratum and do not force the engine to award evidence or learn exempt requirements. Main sensitivity: a stratum whose initial mandatory needs cover all unachieved target requirements; keep its results separate, without selectively dropping unfavorable baseline-exempt cases.

## Compared policies

**S0 primary static.** Freeze the same baseline-derived initial requirements, option set and display order supplied to adaptive. Resolve initial module choice with one shared deterministic rule. Keep the curriculum fixed, permitting retries under the same assessment/access policy. Consume results into the same achievement evaluator, but do not add new requirements or alter curriculum order from feedback. If unmet prerequisites prevent completion, retain the failure and eventual noncompletion; do not waive conditions to make S0 pass.

**A0 adaptive.** Use the existing generation, planning and recalculation owners to react to accepted assessment evidence, deduplicate supplementation and update dependencies. Preserve history and official evidence. Research-only adapters may supply isolated snapshots, but must reproduce the runtime transitions; a separate favorable Python reimplementation is not the evaluated engine.

**S1 sensitivity static.** Precompute target needs plus all compatible prerequisites not officially achieved, order once and freeze. Use the same evidence evaluator and retry conditions. This comparator intentionally differs from the application's rule of not expanding unassessed prerequisites initially; it is not a production policy change. Report it separately to test whether gains arise only from an overly restrictive S0.

Across all policies hold constant: initial learner states, catalog/policy versions, initial review choices, module selection tie rule, question-group scoring, mandatory/veto conditions, completion/evidence criteria and retry/wait handling. Record simulated review setup as synthetic; never fabricate a human Expert approval. Freeze provision changes/certificates/bypass out of the primary module-only experiment and evaluate them in explicit robustness cases if needed.

## Activity budget and common learner model

Use standardized activity units, not hours. Every learning action and assessment attempt consumes cost, including failed attempts and full retakes. Proposed pilot: learning action cost 1, full configured assessment cost 1, total budget 40; secondary checkpoints 10/20/30. Sensitivity: assessment cost 0.5/1/2 and horizon 20/40/80. No zero-cost learning. Before final runs choose and freeze costs/horizon based on feasibility and expert review, not which policy wins. A retained completed lesson is not automatically charged again unless a genuine review action occurs. Retry waits use a shared virtual clock; report waiting separately and do not override access rules silently.

Proposed transparent simulator, to review before implementation:

- Hidden learner state z(u,r) lies in [0,1] for each requirement r. It is available to the simulator only; the recommender sees observed results/evidence, not z.
- For a module teaching r, a learning action updates `z' = z + eta × (1-z)`. Proposed eta values 0.1/0.2/0.3 are sensitivity settings, not measured rates. Review actions may use the same bounded update if permitted by the frozen policy.
- Let q be the mean hidden knowledge over declared prerequisite requirements for that group; q=1 when none exist. Question correctness probability is `clip(g + (1-g-s) × z × ((1-lambda)+lambda×q), 0.01, 0.99)`. Proposed pilot g=0.2, s=0.1, lambda=0.5. Include lambda=0/0.5/1, slower/faster learning and equal-knowledge controls. Values are assumptions and cannot be chosen from final outcome advantages.
- Sample question-level outcomes, then let the real scoring rules decide MAIN/prerequisite group pass, mandatory conditions and veto. Do not equate a random probability draw directly with official achievement or skip module-completion conditions. Freeze the treatment of incorrect/unanswered items and the prerequisite relation used for each group.
- Key random draws by seed, learner, requirement, module, attempt count, item and event type. Separate learning/question/policy-choice random streams. Corresponding opportunities across policies share random values; differing action sequences must not merely shift a single global random stream. Different probabilities may yield different outcomes under the same draw.

This simulator is a research model of learning, not a new production knowledge-tracing subsystem. Its assumptions can favor certain policies; sensitivity tests, S1 and equal/no-prerequisite controls are required to expose that dependence. The primary randomized-failure methodology is retained, while the failure probability changes with learning history rather than being fixed independently of learning.

## Runtime policy gate

Current source `RequirementPathwayPlanningService.refresh` can mark a supplemented step ASSESSED_SATISFIED following compatible assessment history; `RequirementPathway.Step.resolved()` treats it as resolved without official evidence. Some existing domain prose states a later passing assessment cannot remove an earlier actual-learning requirement. This conflict must be reconciled against approved business decisions and runtime traces **before the engine snapshot is frozen**. Do not select the interpretation that produces the largest adaptive advantage. Regardless of the chosen policy, ASSESSED_SATISFIED is not official achievement in D.

Before simulation, trace actual outcomes for: main failure; prerequisite failure without official evidence; already-official prerequisite failure/NEED_REVIEW; mandatory/veto failure; full retake; repeated event; shared prerequisite deduplication; compatible reassessment; all-pass; no provision; baseline-exempt completion. Reuse WF05 fixtures and the current service owners. Missing branch verification is a blocker, not permission to approximate silently.

## Outcomes and analysis

Primary paired effect at frozen budget B: `DeltaD = mean(D_static(u,B) - D_adaptive(u,B))`; positive favors adaptive. Report baseline distance and both final distances, not only the difference. Record the trajectory at checkpoints. If no action is possible before B, carry the last state forward and record stopped reason and actual budget consumed; never spend fictional actions or delete the learner.

Secondary outcomes: proportion D=0; pathway-release rate separately; costs to equivalent target achievement; distinct remedial requirements and assigned module IDs; actual learning actions; full assessment attempts/retakes; failed/blocked/noncompleted cases. Do not count all interchangeable options as required workload. Counts of added requirements and selected assigned modules are separate, especially for S1's upfront prerequisite curriculum.

Cost-to-target summaries must include noncompletion counts and right-censoring at B. A mean among successful learners alone is potentially selected and must not be presented as overall efficiency. Report paired complete-case cost descriptively alongside attainment for the full cohort.

Proposed 30 stochastic replicates of the same 100 learners; average per-learner effects across replicates, then bootstrap learners for a paired interval. Preserve per-seed results to show randomness and disclose synthetic-profile dependence. Do not call 100 × 30 independent learners. Final replicate count, parameters and primary checkpoint are frozen before test runs.

## Artifacts and readiness

Store reviewed inputs under `data/rq3/<version>/` and runs under `results/rq3/<run-id>/`. Persist each event: learner/policy/seed, action, cost, hidden simulation state in a separate evaluator-only artifact, observed outcomes, exact evidence changes, pathway revision, D before/after, block reason and remaining budget. Retain model/config version and engine source hashes. The policy-facing input must exclude hidden state.

Final readiness requires simulator/rubric review, policy-conflict resolution, runtime parity, deterministic state traces under fixed seeds, equal-cost accounting, no hidden-state leakage, no double evidence, and an explicit censoring rule. Readiness against this list (run r2):

| Requirement | Status |
|---|---|
| Policy-conflict resolution | Done. Runtime never produces ASSESSED_SATISFIED in this path; assigned prerequisite learning persists until official evidence ([Rq3RuntimeTransitionTest](../../backend/src/test/java/com/adaptlearngraph/research/Rq3RuntimeTransitionTest.java)). |
| Runtime parity | Done. A0 calls `RequirementPathwayRecalculationService.supplement`; all policies refresh through `RequirementPathwayGenerationService.step` + `RequirementPathwayPlanningService.refreshedStep`, the same static transitions the persisted job uses. Isolated snapshots replace the JPA/graph stores only. |
| Deterministic state traces | Done. Fixed-seed reruns are equal; `events.jsonl.gz` records every action. |
| Equal-cost accounting | Done. Tested for assessment cost 0.5/1/2. |
| No hidden-state leakage | Done. Hidden state is written only to `hidden-state.jsonl.gz`; a test asserts policy events contain no hidden keys. |
| No double evidence | Done. Tested on the event log. |
| Explicit censoring rule | Done. Right-censoring at B with restricted mean cost. |
| Simulator/rubric expert review | **Open.** No human review exists; none is fabricated. |
| Frozen cohort manifest | **Open.** `data/rq3/pilot-v0.1/manifest.json` stays `DRAFT_PILOT_INPUTS` until review. |

## Empirical outcomes, run r2 with runtime parity (25 November 2026)

Executed with `com.adaptlearngraph.research.Rq3SimulationRunner` (`baseSeed = 20261125`, 30 replicates, 100 profiles: 34 Junior, 33 Middle, 33 Senior; budget 40; `eta = 0.20`, `guess = 0.20`, `slip = 0.10`, `lambda = 0.50`; learning and assessment cost 1). All three policies use one shared selection rule: round-robin over the current plan order, skipping resolved steps, steps without provision and steps with unresolved dependencies. Each retake requires a review learning action first.

| Checkpoint (units) | S0 D(b) | A0 D(b) | S1 D(b) | Paired ΔD (S0 − A0) | S0 D_gap(b) | A0 D_gap(b) | Paired ΔD_gap (S0 − A0) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.7067 | 0.7067 | 0.7067 | +0.0000 | 1.0000 | 1.0000 | +0.0000 |
| 10 | 0.6792 | 0.6748 | 0.6605 | +0.0044 | 0.7153 | 0.7244 | −0.0091 |
| 20 | 0.6541 | 0.6363 | 0.6186 | +0.0178 | 0.5109 | 0.4995 | +0.0114 |
| 30 | 0.6322 | 0.5995 | 0.5834 | +0.0327 | 0.3707 | 0.3134 | +0.0573 |
| 40 | 0.6128 | 0.5701 | 0.5565 | +0.0427 | 0.2616 | 0.1921 | +0.0695 |

- **Primary paired effect ΔD(40) = D_S0(40) − D_A0(40)**: `+0.0427` (10,000-resample paired percentile bootstrap 95% CI `[+0.0342, +0.0520]`, `SE = 0.0046`). A0 had lower distance on 72 profiles, tied on 27 and was higher on 1.
- **S1 sensitivity comparator**: S1 is lower than A0. ΔD(40) = D_S1 − D_A0 = `−0.0136` (95% CI `[−0.0177, −0.0098]`). The gain over S0 therefore does not show that reacting to evidence beats a curriculum that expands every unachieved prerequisite up front.
- **Initial gap ΔD_gap(40)**: `+0.0695` (95% CI `[+0.0495, +0.0912]`).
- **Prerequisite exposure control**: in the 25 profiles whose declared prerequisites were all official at baseline, S0, A0 and S1 are identical (ΔD = 0, release 95.33%). In the 75 exposed profiles ΔD = `+0.0569` (`0.6720` vs `0.6151`); release rates are 34.09% / 50.67% / 54.09% (S0 / A0 / S1).

Secondary outcomes (3,000 learner × replicate runs per policy; costs right-censored at B = 40):

| Policy | D = 0 | Gap closed | Closed / censored | Restricted mean cost to gap closure | Mean cost, attainers only | Learn / assess / retake | Failed attempts | Remedial requirements | Assigned modules | Review events |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 | 0.0% | 49.40% | 1482 / 1518 | 29.88 | 19.52 | 14.94 / 14.94 / 10.62 | 12.18 | 0.00 | 4.32 | 1.21 |
| A0 | 0.0% | 61.83% | 1855 / 1145 | 28.17 | 20.86 | 14.08 / 14.08 / 8.52 | 10.07 | 1.26 | 5.57 | 2.71 |
| S1 | 0.0% | 64.40% | 1932 / 1068 | 27.59 | 20.72 | 13.79 / 13.79 / 8.38 | 9.39 | 0.00 | 5.41 | 3.74 |

No run reached D = 0. Baseline-exempt target requirements never receive official evidence under any policy. Paired complete-case cost, counting only pairs in which both policies closed the gap, is descriptive: S0 vs A0, 1,444 of 3,000 pairs, 19.06 vs 18.09 units; S1 vs A0, 1,840 pairs, 19.96 vs 20.73 units. Every run stopped by `PATHWAY_RELEASED` or `BUDGET_EXHAUSTED`; none was blocked by missing provision.

Sensitivity (same 100 profiles × 30 replicates; D is measured at each row's own budget B):

| Setting | η | λ | Assessment cost | B | Equal knowledge | S0 D(B) | A0 D(B) | S1 D(B) | ΔD S0 − A0 [95% CI] | ΔD S1 − A0 |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| Primary | 0.20 | 0.50 | 1 | 40 | no | 0.6128 | 0.5701 | 0.5565 | +0.0427 [+0.0342, +0.0520] | −0.0136 |
| Slower learning | 0.10 | 0.50 | 1 | 40 | no | 0.6297 | 0.5912 | 0.5786 | +0.0385 [+0.0309, +0.0466] | −0.0126 |
| Faster learning | 0.30 | 0.50 | 1 | 40 | no | 0.6001 | 0.5544 | 0.5415 | +0.0456 [+0.0364, +0.0558] | −0.0129 |
| No item coupling | 0.20 | 0.00 | 1 | 40 | no | 0.6024 | 0.5629 | 0.5497 | +0.0395 [+0.0316, +0.0481] | −0.0131 |
| Full item coupling | 0.20 | 1.00 | 1 | 40 | no | 0.6225 | 0.5776 | 0.5645 | +0.0448 [+0.0359, +0.0544] | −0.0131 |
| Cheaper assessment | 0.20 | 0.50 | 0.5 | 40 | no | 0.5939 | 0.5442 | 0.5346 | +0.0497 [+0.0397, +0.0607] | −0.0096 |
| Costlier assessment | 0.20 | 0.50 | 2 | 40 | no | 0.6408 | 0.6136 | 0.5962 | +0.0272 [+0.0213, +0.0335] | −0.0174 |
| Short horizon | 0.20 | 0.50 | 1 | 20 | no | 0.6541 | 0.6363 | 0.6186 | +0.0177 [+0.0133, +0.0225] | −0.0177 |
| Long horizon | 0.20 | 0.50 | 1 | 80 | no | 0.5730 | 0.5206 | 0.5168 | +0.0524 [+0.0408, +0.0653] | −0.0038 |
| Equal initial knowledge | 0.20 | 0.50 | 1 | 40 | yes | 0.6178 | 0.5712 | 0.5584 | +0.0466 [+0.0370, +0.0570] | −0.0128 |

The A0 vs S0 direction holds in every row; S1 stays below A0 in every row. With λ = 0 the gain remains. A0's advantage therefore does not depend on item-level coupling. It comes mainly from the runtime evaluator, which withholds achievement while a prerequisite group fails: S0 never studies prerequisites and passes those groups only by chance.

Artifacts: [report](results/rq3/20261125-r2-runtime-parity/report.json), policy-facing [event log](results/rq3/20261125-r2-runtime-parity/events.jsonl.gz) (265,904 events), evaluator-only [hidden state](results/rq3/20261125-r2-runtime-parity/hidden-state.jsonl.gz), [run manifest with engine and input SHA-256](results/rq3/20261125-r2-runtime-parity/run-manifest.json), [verification record](evidence/rq3/20261125/README.md).

## Interpretation limits

A lower simulated D supports adaptation only under the declared model and catalog. It does not establish workforce productivity, real educational benefit, BKT prediction accuracy, a globally optimal path or hours saved. Null/negative effects remain reportable outcomes. The one-week target covers preparation and pilot, not a guaranteed favorable final result.
