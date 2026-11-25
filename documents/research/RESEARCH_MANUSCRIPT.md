# Knowledge Graph Based Adaptive Learning Pathways for Workforce Competency Development

Manuscript draft · Adapt-Learn-Graph · SEP490 · FA26SE267 · 25 November 2026

## Abstract

Workforce training platforms need to select learning modules that address gaps against a target role and update the pathway as new assessment evidence arrives. We evaluate a competency graph prototype through recommendation agreement, graph query latency, and a paired comparison of static and adaptive pathways. Using 50 synthetic Application Developer profiles and a 72-module catalog, graph matching produced at least one exact match to a consensus shortlist for 48 profiles (96%), compared with 41 (82%) for a content-based TF–IDF baseline. Mean overlap within the first five recommendations was 2.30 and 1.28 modules, respectively. Directed Neo4j prerequisite queries on separate 1,000-, 5,000- and 10,000-node synthetic graphs had median latencies between 6 and 20 ms across four runs per scale. Run-to-run variation was as large as the differences between sizes, and latency did not increase monotonically with size. Across 100 synthetic learners evaluated over 30 seeded replicates under a 40-unit activity budget, evidence-driven adaptive recalculation (A0), executed through the application's own recalculation transitions, reduced remaining target distance from 0.7067 to 0.5701, compared with 0.6128 for the fixed static pathway (S0). The mean paired gain was 0.0427 (95% bootstrap CI [0.0342, 0.0520]), and pathway completion rose from 49.40% to 61.83%. A static curriculum that expands all unachieved prerequisites up front (S1) reached 0.5565, lower than A0. The evidence supports descriptive conclusions about shortlist agreement, the measured query workload, and prerequisite remediation under the modeled learner dynamics.

## 1 Introduction

Employees targeting the same role can have different competency gaps. A catalog organized only by course title makes it difficult to connect those gaps to the skills and knowledge levels a module teaches. Adapt-Learn-Graph represents role requirements, skills, levels, teaching relationships and prerequisites as structured data. Baseline assessment identifies initial learning needs. Later assessments can provide new evidence and trigger pathway recalculation.

The study separates three questions. **RQ1** compares the agreement of initial module recommendations with a consensus shortlist. **RQ2** observes how latency for directed prerequisite path queries varies across three graph sizes. **RQ3** asks whether evidence-driven recalculation decreases the distance to a target role more than a static pathway under equal activity budgets. The registered wording and operational definitions are recorded in the [research framework](RESEARCH_FRAMEWORK.md).

## 2 Related work

We follow a design science approach in which artifact construction and evaluation are separated (Peffers et al., 2007). Path-based recommendation can expose the relationships underlying a learning suggestion (Frej et al., 2024). We compare structured matching with a text baseline so that the evaluation can distinguish agreement from a simple content similarity measure. Partial relevance judgments constrain which ranking metrics can be interpreted, so the current shortlist comparison does not infer catalog-wide recall. Our latency analysis distinguishes a measured run from a repeatable effect across independent runs (Kalibera and Jones, 2013). For RQ3, the evaluated system recalculates pathways from assessment evidence. Bayesian knowledge tracing (Corbett and Anderson, 1994) is related work and is outside the implemented comparison.

## 3 Data and methods

### 3.1 Recommendation agreement

The Application Developer catalog contains 20 skills and 72 synthetic module specifications across Foundation, Intermediate and Advanced. The synthetic profile dataset contains 450 development profiles and 50 held-out profiles across Junior, Middle and Senior. Each profile specifies a target role level, compatible prior evidence, and baseline pass or fail observations by skill and knowledge level. A baseline pass can exempt the learner from an initial learning task without granting official achievement.

Both methods ranked the same 72 candidates. **G0** scores an exact match to an unmet skill, knowledge level and version using the module teaching relationship. **C0** ranks by cosine similarity between TF–IDF representations of the learning needs and module text. Both produce five suggestions. The reference is the exact-ID intersection of the two submitted priority lists used in the [consensus workbook](RQ1_Golden_Set_50_Dong_Thuan.xlsx). The lists were identical for 23 profiles and differed for 27. For the latter, only their common selections entered the reference. Alternative module IDs were recorded separately and did not contribute to the reported scores.

For each profile, the match count is the number of exact module IDs shared by the method's Top 5 and the consensus list. We report the percentage of profiles with at least one match (Hit Rate@5 against the consensus list), the mean match count per profile, and shortlist recall (matches divided by shortlist size). Paired G0 − C0 differences use a 10,000-resample percentile bootstrap over profiles. Modules outside the reference remain unjudged. These measures operationalize agreement with priority selections and do not measure relevance across the entire catalog.

### 3.2 Directed prerequisite query latency

The RQ2 runner used Neo4j Community 5.26.33 on three separate synthetic graphs composed of MicroSkill nodes. Prerequisite edges run from a dependent skill to its prerequisite. All graphs had 1.8 directed relationships per node. The workload validated eligible directed shortest paths of 3, 4 and 5 hops before timing. Each scale used 50 warm-up queries and 100 measured queries. The Neo4j driver timer covered query execution and full consumption of results. We report P50, P95 and mean wall-clock latency from the saved responses. Each scale was run once on 24 November and in three further rounds on 25 November, with the scale order rotated each round; we report the median and range across those three rounds.

### 3.3 Adaptive pathway efficiency

The experiment compares 100 synthetic Application Developer profiles (34 Junior, 33 Middle and 33 Senior) disjoint from the RQ1 golden set across 30 seeded stochastic replicates. Static **S0**, adaptive **A0** and sensitivity static **S1** start with the same initial learner state, official evidence and paired random streams. S0 keeps the baseline-derived curriculum fixed while allowing retries under the shared assessment policy. A0 applies the application's own supplementation transition (`RequirementPathwayRecalculationService.supplement`) after each skill assessment: when a prerequisite group without prior official achievement fails, A0 adds or reuses the prerequisite step and blocks the dependent step until official prerequisite evidence is earned. S1 pre-expands all unachieved prerequisites up front in topological order. Every policy refreshes its plan through the same runtime per-step transition and uses one shared selection rule, round-robin over the current plan order. The research adapter supplies isolated catalog and evidence snapshots in place of the database and graph stores. Each learning action and assessment attempt costs one unit, including failures and retries, and each retake requires a review learning action first. The budget is 40 units per learner and policy, with checkpoints at 0, 10, 20, 30 and 40.

For each checkpoint, primary target distance $D(u, b)$ equals the fraction of target skill–knowledge–version requirements without compatible official achievement evidence (`Rq3Distance`). We also track initial mandatory gap distance $D_{\text{gap}}(u, b)$ over the profile's unachieved initial learning needs. Prerequisites outside the target, baseline exemptions and resolved steps without official evidence do not enter the achievement set. The primary effect is the mean paired difference $\Delta D = D_{\text{S0}}(u, 40) - D_{\text{A0}}(u, 40)$ across the 100 learners (averaged over 30 replicates per learner, with a 10,000-resample percentile bootstrap 95% confidence interval). When a learner completes their pathway early, the analysis carries forward their last observed distance and records actual budget consumed. Cost-to-attainment outcomes are right-censored at the budget and summarized as restricted mean cost. Sensitivity runs vary η, λ, assessment cost (0.5/1/2), horizon (20/40/80) and an equal-initial-knowledge control. The [RQ3 protocol](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md) gives the simulator and sensitivity analysis specification.

## 4 Results

### 4.1 RQ1 agreement with consensus module selections

| Method | Profiles with at least one match | Hit Rate@5 | Mean exact matches per profile | Shortlist recall |
|---|---:|---:|---:|---:|
| G0 structured graph matching | 48/50 | 96% | 2.30 out of 5 | 0.836 |
| C0 content-based TF–IDF | 41/50 | 82% | 1.28 out of 5 | 0.548 |
| G0 minus C0 (paired, 95% bootstrap CI) | 7 profiles | +14 pp [+6, +24] | +1.02 [+0.72, +1.32] | +0.288 [+0.210, +0.369] |

G0 agreed more frequently with the consensus shortlist on this cohort and had greater average overlap. Per profile, G0 had more matches on 29 profiles, tied on 21 and had fewer on none. Both G0 misses are Middle profiles with nine gaps, where all five G0 suggestions taught a gap but the single consensus pick fell outside the five slots. The figures were reproduced on 25 November 2026 from the two workbooks with the benchmark engine ([report](results/rq1/20261125-rerun/report.json)). The result is descriptive. The reference contains only common selections, so a recommendation missing from it may still be suitable. This result does not establish superiority against every acceptable recommendation or across other roles or catalogs.

### 4.2 RQ2 latency on the three measured graphs

| Nodes | Prerequisite relationships | 24 Nov run: P50 / P95 / Mean (ms) | 25 Nov, 3 rounds: P50 median [range] | P95 median [range] | Mean median [range] |
|---:|---:|---:|---:|---:|---:|
| 1,000 | 1,800 | 9.24 / 37.16 / 13.51 | 12.77 [11.10–16.25] | 45.29 [35.78–67.42] | 16.90 [16.67–24.06] |
| 5,000 | 9,000 | 6.01 / 17.25 / 7.65 | 17.79 [15.79–20.27] | 58.67 [56.84–76.24] | 24.83 [23.47–31.07] |
| 10,000 | 18,000 | 12.13 / 51.82 / 18.73 | 16.34 [15.39–16.54] | 53.11 [47.36–53.19] | 21.50 [21.00–23.13] |

Each run used 50 warm-up and 100 measured queries. Latency stayed in the same range at all three sizes and did not increase monotonically. The spread between rounds at one size was comparable to the differences between sizes. All 25 November rounds were slower than the 24 November runs, which indicates that host state affected absolute values more than graph size did. The result applies to this prerequisite workload, one graph seed per size and the graph generator used; it is not an asymptotic complexity estimate.

### 4.3 RQ3 adaptive pathway outcomes

| Budget checkpoint (units) | S0 Static D(b) | A0 Adaptive D(b) | S1 Upfront D(b) | Paired ΔD (S0 − A0) | S0 Gap D_gap(b) | A0 Gap D_gap(b) | Paired ΔD_gap (S0 − A0) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.7067 | 0.7067 | 0.7067 | +0.0000 | 1.0000 | 1.0000 | +0.0000 |
| 10 | 0.6792 | 0.6748 | 0.6605 | +0.0044 | 0.7153 | 0.7244 | −0.0091 |
| 20 | 0.6541 | 0.6363 | 0.6186 | +0.0178 | 0.5109 | 0.4995 | +0.0114 |
| 30 | 0.6322 | 0.5995 | 0.5834 | +0.0327 | 0.3707 | 0.3134 | +0.0573 |
| 40 | 0.6128 | 0.5701 | 0.5565 | +0.0427 | 0.2616 | 0.1921 | +0.0695 |

At the 40-unit budget, A0 achieved a lower remaining target distance than S0 on 72 of 100 profiles, tied on 27, and had a slightly higher distance on 1 profile. The mean paired target distance reduction was $\Delta D(40) = +0.0427$ (95% bootstrap CI $[+0.0342, +0.0520]$, $\text{SE} = 0.0046$), and the mean initial mandatory gap reduction was $\Delta D_{\text{gap}}(40) = +0.0695$ (95% CI $[+0.0495, +0.0912]$). S1 was lower than A0: $D_{\text{S1}} - D_{\text{A0}} = -0.0136$ (95% CI $[-0.0177, -0.0098]$). Initial gaps were closed in 49.40%, 61.83% and 64.40% of the 3,000 learner-replicate runs under S0, A0 and S1. Restricted mean cost to gap closure was 29.88, 28.17 and 27.59 units, with B = 40 charged to the 1,518, 1,145 and 1,068 censored runs. No run reached D = 0, because baseline-exempt target requirements never receive official evidence. A0 supplemented 1.26 prerequisite requirements per run.

| Cohort stratum | Profiles | Baseline D(0) | S0 Final D(40) | A0 Final D(40) | S1 Final D(40) | Paired ΔD (S0 − A0) | Release S0 / A0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Has unachieved prerequisites | 75 | 0.7699 | 0.6720 | 0.6151 | 0.5970 | +0.0569 | 34.09% / 50.67% |
| All prerequisites already achieved | 25 | 0.5169 | 0.4351 | 0.4351 | 0.4351 | +0.0000 | 95.33% / 95.33% |
| Junior role level | 34 | 0.7418 | 0.5969 | 0.5283 | 0.5059 | +0.0686 | 48.92% / 61.76% |
| Middle role level | 33 | 0.6863 | 0.6078 | 0.5779 | 0.5680 | +0.0299 | 52.93% / 64.34% |
| Senior role level | 33 | 0.6908 | 0.6341 | 0.6054 | 0.5972 | +0.0287 | 46.36% / 59.39% |

Across the 25 profiles where all prerequisite requirements were already officially achieved at baseline, S0, A0 and S1 produced identical outcomes ($\Delta D = 0.0000$). The adaptive gain is therefore confined to the 75 profiles with unachieved prerequisites ($\Delta D = +0.0569$). At checkpoint 10, A0 shows a higher mandatory gap distance than S0 ($0.7244$ vs $0.7153$) because early budget goes to supplemented prerequisites; from checkpoint 20, A0 is lower. Across ten sensitivity settings, ΔD(S0 − A0) stayed positive with confidence intervals above zero, ranging from +0.0177 at a 20-unit horizon to +0.0524 at an 80-unit horizon. S1 stayed below A0 in every setting. The gain persisted with no item-level prerequisite coupling (λ = 0, +0.0395). This indicates that the advantage comes mainly from the evaluator withholding achievement while a prerequisite group fails, which S0 can satisfy only by chance. [Verification record](evidence/rq3/20261125/README.md).

## 5 Discussion and limitations

The RQ1 evidence suggests that structured skill and level matching can reproduce more of the shared priority selections in the current synthetic catalog than the implemented text baseline. The same role definitions structure the catalog and the displayed learner needs, which may favor graph matching. Cases with many unmet requirements also force reviewers to prioritize some valid needs within a five-module limit. Reporting exact module IDs excludes alternative modules that achieve equivalent objectives. The reference records agreement between the two included submissions and does not estimate the full set of relevant modules.

RQ2 shows that the implementation can execute the specified 3–5-hop workload across three distinct graph sizes. Three rotated rounds per size show that run-to-run variation is of the same magnitude as the differences between sizes. Additional graph seeds, larger query blocks and full raw-sample export would be needed for a firmer conclusion about a size effect. The synthetic graph contains only prerequisite edges and MicroSkill nodes, so the reported figures do not describe a mixed production ontology or simultaneous users.

RQ3 distinguishes official achievement from diagnostic baseline exemption. Because baseline passes exempt initial learning without awarding official achievement evidence, baseline-exempt target requirements remain outside $E(u, b)$ unless studied as a prerequisite; consequently, S1 achieves a lower final target distance than A0 ($0.5565$ vs $0.5701$) by forcing upfront study of all unachieved prerequisites, whereas A0 adheres to the application rule of supplementing a prerequisite only after an assessment failure reveals a gap. Any observed difference from this simulation depends on the modeled learning and assessment dynamics and does not establish that real employees learn faster. The simulator assumptions, rubric and prerequisite relations have not yet been reviewed by an independent expert, so the RQ3 results are a pilot.

## 6 Conclusion

The RQ1 comparison shows higher exact agreement for G0 on the 50-profile consensus reference. RQ2 measured median latencies of roughly 6–20 ms on three isolated Neo4j prerequisite graphs, without a monotonic increase from 1,000 to 10,000 nodes. RQ3 demonstrates that under the modeled prerequisite assessment rules and a 40-unit activity budget, evidence-driven pathway recalculation (A0) reduces remaining target distance more than a fixed static curriculum (S0) on profiles with unachieved prerequisites, but less than a static curriculum that expands all unachieved prerequisites up front (S1). These findings characterize the current prototype under the documented synthetic inputs.

## References

- Peffers, K., Tuunanen, T., Rothenberger, M. A., and Chatterjee, S. (2007). A Design Science Research Methodology for Information Systems Research. *Journal of Management Information Systems*, 24(3), 45–77. DOI 10.2753/MIS0742-1222240302.
- Frej, J., Shah, N., Knežević, M., Nazaretsky, T., and Käser, T. (2024). Finding Paths for Explainable MOOC Recommendation: A Learner Perspective. *LAK 2024*. DOI 10.1145/3636555.3636898.
- Corbett, A. T., and Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4, 253–278. DOI 10.1007/BF01099821.
- Kalibera, T., and Jones, R. (2013). Rigorous Benchmarking in Reasonable Time. *ISMM 2013*, 63–74. DOI 10.1145/2464157.2464160.

## Reproducibility artifacts

- RQ1: [baseline workbook](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx), [consensus workbook](RQ1_Golden_Set_50_Dong_Thuan.xlsx), [profile manifest](data/rq1/profiles-v0.1/manifest.json), [rerun report](results/rq1/20261125-rerun/report.json), [run manifest](results/rq1/20261125-rerun/run-manifest.json).
- RQ2: [25 Nov rounds and summary](results/rq2/20261125-rerun/summary.json), [1k run](results/rq2/20261124-standalone/rq2-standalone-20261124-172324-1k.json), [5k run](results/rq2/20261124-standalone/rq2-standalone-20261124-172832-5k.json), [10k run](results/rq2/20261124-standalone/rq2-standalone-20261124-173041-10k.json), [runner instructions](RQ2_LOCAL_SETUP.md).
- RQ3: [pilot cohort manifest](data/rq3/pilot-v0.1/manifest.json), [100-profile 30-replicate result r2](results/rq3/20261125-r2-runtime-parity/report.json), [event log](results/rq3/20261125-r2-runtime-parity/events.jsonl.gz), [run manifest](results/rq3/20261125-r2-runtime-parity/run-manifest.json), [runtime and UI verification record](evidence/rq3/20261125/README.md).
