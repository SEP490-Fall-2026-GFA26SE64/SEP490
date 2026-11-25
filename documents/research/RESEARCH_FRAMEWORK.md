# Knowledge Graph Based Adaptive Learning Pathways for Workforce Competency Development

Research framework and evaluation plan • Version 0.4 • 25 November 2026

## Abstract

This study evaluates an existing knowledge-graph-based learning system for selecting modules that address competency gaps and revising learning pathways when assessment evidence changes. The case concerns the Application Developer role at Junior, Middle and Senior levels. The system connects role requirements, skills, versioned learning content and evidence of attainment through explicit mappings and rules.

The evaluation comprises three complementary experiments: expert-judged recommendation relevance against content-based filtering; directed prerequisite-query latency on isolated graphs of 1,000, 5,000 and 10,000 nodes; and simulated adaptive versus static pathways under an equal activity budget. The intended contribution is a reproducible evaluation of the implemented approach and its limits. No new learning algorithm or improvement in real employee outcomes is claimed in advance.

This framework defines the study design. Version 0.3 (23 November 2026) preceded any experiment and included a diagnostic audit of the existing RQ2 service, which found that its scale labels and adjusted timings could not establish scalability. Version 0.4 records that all three experiments have since been run at pilot level; the results are reported in RESEARCH_MANUSCRIPT.md. Final runs still require independent expert review of the catalog, the RQ1 labels and the RQ3 simulator assumptions.

## Research problem and intended contribution

A workforce learning system must connect a target role to the learner's current evidence, identify suitable content, and respond to subsequent successes and failures. A relevant recommendation alone does not demonstrate efficient adaptation, and a fast graph query alone does not demonstrate educational value. The three research questions therefore address different parts of one system evaluation.

The proposed contribution is a transparent account of how explicit Role–Level requirements, compatible module mappings, diagnostic evidence and official attainment interact in this implementation. Reproducible data, expert judgments, valid query workloads and auditable learning traces are central outputs. Positive, null and adverse findings are all valid outcomes.

<!-- pagebreak -->

## Related research and positioning

Design Science Research provides an organizing process for defining a problem, developing an artifact, demonstrating it and evaluating it [R1]. Here the artifact already exists; inspection and evaluation precede claims about effectiveness. The study does not assume that building a functioning platform answers the research questions.

Educational knowledge-graph recommendation is established prior work. Frej et al. examine path-based MOOC recommendation from a learner perspective [R2]. Afreen et al. investigate educational generalization of path-based explainable recommenders [R3]. KnowLP combines knowledge structures with a learned pathway recommendation approach and simulator-based evaluation [R4]. These studies motivate comparison, but their results cannot be transferred to this workforce case.

The implemented system uses deterministic rules and evidence updates. It does not estimate latent mastery with Bayesian Knowledge Tracing. This distinction matters because the registered wording of RQ3 uses “Knowledge Tracing”; Corbett and Anderson's probabilistic formulation [R5] is conceptually different. The paper retains the registered question while describing the actual mechanism precisely. Any formal change to the registered wording requires the appropriate academic decision.

Evaluation methodology also affects conclusions. Sampled ranking metrics can alter recommender comparisons [R6], so both methods must rank a common catalog. Benchmark variability requires repeated measurements and explicit environmental reporting [R7]. These principles guide the protocols without supplying expected numerical results.

## Registered research questions

RQ1: How does the Recommendation Relevance (Hit Rate@5) of the Graph-Traversal algorithm compare to a baseline Content-Based Filtering approach for matching learning modules to skill gaps?

RQ2: What is the query latency of deep pathfinding operations in Neo4j (e.g., 3-hop to 5-hop depth) as the number of nodes/edges in the competency ontology scales from 1,000 to 10,000?

RQ3: Does dynamic pathway recalculation (Knowledge Tracing) result in a mathematically shorter distance to the Target Role profile compared to static predefined pathways?

These questions retain the wording in the project registration, Version 3, section 3.3. RQ1 addresses relevance; RQ2 addresses the cost of a specific graph operation; RQ3 addresses simulated progress toward official target attainment. Their findings jointly characterize the system rather than establish one universal superiority claim.

<!-- pagebreak -->

## Study design and implementation boundaries

The method is an artifact-centered evaluation with three controlled experiments. Synthetic profiles allow reproducible coverage of role levels and evidence states; independent expert judgments provide the RQ1 relevance reference. Isolated generated graphs support RQ2 scale control. A shared stochastic learner model supports paired RQ3 comparisons. These sources answer bounded engineering questions and do not replace a field study with employees.

The initial study covers Application Developer at three levels. Reviewer expertise may include software development, AI and IoT, but the evaluated population and catalog remain the selected role case. Version 3 excludes full educational content creation. Review the synthetic module descriptions, learning outcomes, skill and level mappings, prerequisites and version compatibility before freezing the benchmark; complete lessons are not required.

The rebuilt research catalog contains 20 retained skill identities, 60 skill–knowledge pairs and 72 synthetic module specifications. Junior has 18 required groups, Middle 37 and Senior 49. The 31 directed prerequisite edges and locally authored outcomes remain subject to expert review. Structural checks do not establish expert approval. A separate draft contains 500 synthetic profiles split into 450 development and 50 held-out inputs. For the 50 held-out profiles, two reviewers submitted priority shortlists, and their exact-ID intersection is the current RQ1 reference; complete 0/1/2 relevance labels over the catalog do not yet exist.

The current initial pathway planner selects valid mapped options and orders them deterministically; it does not expose a learned relevance ranking or expand all unassessed prerequisites. RQ1 therefore measures an explicit mapping-based evaluation adapter against text matching. It cannot isolate an effect of prerequisite topology at that initial snapshot. This limitation must remain visible in the eventual paper.

The dynamic engine uses actual assessment evidence to revisit prerequisite needs. Version 0.3 recorded a policy discrepancy: code could mark a prerequisite step ASSESSED_SATISFIED from compatible passed evidence, while older business documentation described supplementation persisting until learning completion. This has been resolved: in the current runtime, assigned prerequisite learning persists until official evidence is earned, which runtime transition tests confirm. A resolved pathway step is never counted as official target achievement.

## Data separation and review

RQ1 now has 500 draft synthetic profiles: 450 for development and 50 held out for final evaluation. Ten development profiles are selected for the annotation pilot. The gold50 inputs have a two-reviewer consensus shortlist but not complete graded labels, so they are not yet a verified golden set. Catalog and profile review remain prerequisites for final evaluation. At least two real experts judge independently before adjudication. No final test label may be used to adjust scoring, text features, tie rules or profile generation.

The one-week preparation target covers framework review, catalog review, pilot preparation and pilot checks. It is not a promise that all three final experiments, expert annotation and paper submission will be complete within that week.

<!-- pagebreak -->

## Experiment 1 Recommendation relevance

The evaluation snapshot is after baseline assessment and before Expert review. Both methods rank the same eligible, available, version-compatible catalog within the same organization. Existing official attainment and the agreed gap definition determine the query. Baseline diagnostics and official achievements retain their distinct meanings.

The proposed graph adapter G0 gives priority to exact mappings to unmet skill–level requirements. Because the existing planner does not supply a relevance score, ties use a fixed seeded identifier hash. C0 uses TF–IDF text similarity between the gap descriptions and reviewed module specification text. Identifiers, review labels and boilerplate are excluded from text features. Both adapters and all tie rules must be fixed before the held-out run.

A secondary comparison ranks only exact-match candidates for both methods. This control separates broad catalog retrieval from ordering among mapped candidates. It does not replace the primary common-catalog evaluation or turn a short candidate list into evidence of strong ranking quality.

Experts assign grades 0, 1 and 2 for irrelevant, supporting and directly relevant modules. Grade 2 defines binary relevance for HR@5. A preferred top-five list and equally acceptable alternatives are recorded separately. Unknown or unjudged modules must never be converted to grade 0. Reviewers do not see method identities or outputs while making their independent judgments.

The primary endpoint is mean profile-level HR@5: a hit occurs when at least one of the first five recommendations has grade 2. Precision@5 uses a denominator of five; insufficient recommendations are disclosed. Recall requires a sufficiently complete positive reference set. nDCG uses the protocol's fixed linear gain and tie conventions and requires a defensible ideal ranking. Zero-positive or incomplete cases receive an explicit handling rule rather than a fabricated score.

Annotation effort is measured in the pilot. The team then freezes full-catalog judgment or a documented limited-judgment design before final evaluation. With limited judgment, every evaluated top-five item must be judged, and unsupported recall or nDCG claims are omitted. Ranking still uses the full common catalog.

Report paired per-profile differences, uncertainty and Junior/Middle/Senior breakdowns. A proposed 10,000-resample profile bootstrap estimates uncertainty; the 50 held-out profiles remain the independent units. Preserve raw rankings, independent labels, adjudication, exclusions and configuration hashes. Do not report accuracy over all 500 profiles after using 450 for development.

Implementation details, formulas, edge cases and evidence requirements are in RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md and EXPERT_ANNOTATION_GUIDE.md.

<!-- pagebreak -->

## Experiment 2 Directed graph query latency

The workload follows directed MicroSkill HAS_SKILL_PREREQUISITE paths whose verified shortest distance is three, four or five hops. This is a query microbenchmark. It does not measure the whole application, compare Neo4j with SQL, or establish production capacity.

Create isolated, versioned ontology snapshots with actual total node counts of 1,000, 5,000 and 10,000. Record label counts, relationship counts, prerequisite degree and depth distributions, indexes and graph hashes. Report the number of MicroSkill nodes separately. Graph growth must preserve a meaningful connected workload; adding irrelevant disconnected nodes cannot stand in for harder prerequisite traversal.

Each scale and seed receives 1,000 unique endpoint pairs with a balanced three-, four- and five-hop distribution. Independently validate endpoints, relation direction and shortest distances against the frozen graph. An offline breadth-first search and the database query must agree. A bounded shortestPath search begins at one hop and checks the resulting distance; searching only paths of length three or more could hide a shorter true route.

The proposed design uses three graph seeds and three measured blocks per seed, 50 warm-up queries per block, randomized query ordering and balanced scale order. These values remain pilot proposals. Record driver, database, Java, hardware, memory, index readiness and cache policy. Measure the same boundary from request submission through full result consumption with a monotonic clock.

Persist every timing and outcome. Report median, mean, P95, failures and variability by graph and block, with the chosen quantile convention. Verify counts and graph identity before and after execution. No synthetic offset, latency floor or fixed comparison table may enter measured output.

## Existing service diagnostic evidence

The 22 November 2026 diagnostic execution used a real local graph containing 1,059 nodes and 4,795 relationships at every requested scale. The service reported 1,098, 5,000 and 10,000 nodes for the three settings and applied timing adjustments. Therefore its returned latency values cannot answer RQ2's scale question.

Among 300 inspected fixture entries, 225 returned no path, 14 returned a path below three hops, and 61 returned a three-to-five-hop path under the old mixed, undirected predicate. This sample is diagnostic evidence, not validation of the full fixtures or the new directed workload. No result does not distinguish an absent endpoint from an unreachable pair.

Since the audit, a standalone runner measures real isolated graphs of 1,000, 5,000 and 10,000 nodes with Cypher-validated 3/4/5-hop fixtures. Remaining repairs are full raw-sample export (exports keep 30 timings), per-depth reporting and multiple graph seeds. The audit called service methods directly; it did not verify HTTP authorization or UI behavior. Protocol and retained evidence appear in RQ2_GRAPH_LATENCY_EXPERIMENT_2.md and evidence/rq2/20261122-current-service-audit/.

<!-- pagebreak -->

## Experiment 3 Adaptive pathway efficiency

Compare 100 simulated learners under adaptive and static policies using the same initial state, target requirements and activity budget. Static freezes the initial curriculum but allows retries. Adaptive uses the frozen evidence-based recalculation policy. A static curriculum containing all prerequisites is a sensitivity control, not an undocumented replacement baseline.

The primary endpoint is remaining distance to official target attainment at a common budget. Distance is the number of unmet official target requirements divided by the fixed number of target requirements. Lower distance indicates greater simulated attainment. External prerequisite work consumes effort but does not enlarge the target denominator. Diagnostic passes, bypasses and resolved pathway steps alone are not official achievements.

A proposed budget is 40 action units, with learning and assessment each costing one unit; failed attempts also cost effort. Intermediate checkpoints and alternative cost ratios and horizons assess sensitivity. These numbers must be reviewed and frozen after the pilot. When a policy stalls or exhausts its available actions, retain its state at the common horizon rather than silently removing that learner.

The shared learner model depends on initial knowledge, learning history and prerequisite knowledge. Learning increases a bounded simulated knowledge state; assessment success depends on that state with common guessing, slip and prerequisite parameters. Neither policy receives an intrinsically higher success probability. The same question-level outcomes pass through the actual scoring and evidence rules, and neither policy can inspect hidden future outcomes or latent state unavailable to the application.

The detailed protocol proposes parameter ranges and a prerequisite-effect sensitivity including zero effect. This checks whether an apparent adaptive advantage is largely imposed by the simulator. Common random events are keyed by learner, replicate, skill and attempt context rather than merely consumed from one sequential random stream after policies diverge.

Thirty stochastic replicates per learner are proposed. Replicates quantify simulation noise; they do not create 3,000 independent learners. Estimate paired effects at the learner level with clustered uncertainty. As a secondary outcome, compare effort to reach the same attainment threshold, retain non-attainers and use explicit right-censoring instead of averaging successful cases only.

The ASSESSED_SATISFIED discrepancy is resolved, the pilot runs through the engine's own transitions, and the event schema is recorded with every run. Before a final run, experts must still review the simulator assumptions. Results support conclusions conditional on this simulator. They cannot establish faster learning by real employees or the validity of a Bayesian Knowledge Tracing model.

RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md contains the model equations, event requirements and analysis specification.

<!-- pagebreak -->

## Reproducibility and validity

Every run requires a manifest containing protocol version, code revision, actual environment, data hashes, seeds, parameters, start and end times, measurement boundaries and exclusions. Templates remain visibly unfilled until real execution. Raw measurements and event traces are immutable; derived tables must be reproducible from them. New runs use new directories rather than overwrite old evidence.

The central construct risks are conflating direct mapping with graph reasoning, treating diagnostic state as official attainment, and presenting simulator efficiency as human learning effectiveness. The design addresses these with explicit adapter definitions, a fixed official target denominator and limited claims. Expert disagreement, sparse alternatives and incomplete judgments remain threats to relevance validity and must be reported.

Internal validity depends on common candidate catalogs, held-out labels, correct graph scales, paired learner conditions and policy-neutral stochastic rules. External validity is limited by one role family, synthetic profiles, generated graph topology and an uncalibrated learner model. A broader literature review and later human evaluation are necessary before broader educational claims.

## Preparation schedule and decision gates

Day 1: review the research problem, registered RQs, terminology and evidence boundaries with the team and supervisor.

Day 2: inspect the Application Developer catalog and role requirements with experts; record corrections and reviewer competence.

Day 3: annotate five to ten development profiles independently; measure effort, resolve rubric ambiguity and determine feasible judgment coverage.

Day 4: prepare the RQ2 implementation repair and isolated graph/fixture design; confirm actual-count and shortest-distance validation requirements.

Day 5: resolve RQ3 evidence policy, review the learner model and prepare trace-parity cases.

Day 6: execute available pilots only after their implementation prerequisites pass; preserve raw evidence and list any blocked checks.

Day 7: review pilot evidence, freeze justified settings and prepare final-run readiness decisions. If gates are incomplete, continue preparation rather than declare final experiments complete.

The seven pilot gates cover catalog quality, label reliability and effort, data separation, graph-scale fidelity, workload integrity, simulator/policy parity and reproducible analysis. PILOT_PLAN.md defines their evidence. As of 25 November 2026, catalog review, complete annotation coverage and expert review of the simulator settings remain open; the RQ3 policy question is resolved.

## Expected paper outputs

The final paper should report RQ1 paired relevance and uncertainty, RQ2 valid latency distributions by actual graph scale, and RQ3 paired distance curves plus censored attainment cost. Explain null or adverse results as carefully as improvements. The conclusion must answer each RQ within its experimental boundary and identify which findings jointly support use of the evaluated artifact.

<!-- pagebreak -->

## References

[R1] Peffers, K., Tuunanen, T., Rothenberger, M. A., and Chatterjee, S. 2007. A Design Science Research Methodology for Information Systems Research. Journal of Management Information Systems 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302

[R2] Frej, J., Shah, N., Knežević, M., Nazaretsky, T., and Käser, T. 2024. Finding Paths for Explainable MOOC Recommendation: A Learner Perspective. LAK 2024. https://doi.org/10.1145/3636555.3636898

[R3] Afreen, N., Balloccu, G., Boratto, L., Fenu, G., Malloci, F. M., Marras, M., and Martis, A. G. 2025. Can Path-Based Explainable Recommendation Methods based on Knowledge Graphs Generalize for Personalized Education? In Proceedings of the 33rd ACM Conference on User Modeling, Adaptation and Personalization (UMAP '25), 273–278. https://doi.org/10.1145/3699682.3728323

[R4] Cheng, X., Zhang, Z., Wang, J., Fang, L., He, C., Guan, Q., Pan, S., and Luo, W. 2025. GraphRAG-Induced Dual Knowledge Structure Graphs for Personalized Learning Path Recommendation. arXiv:2506.22303v2. Preprint. https://arxiv.org/abs/2506.22303

[R5] Corbett, A. T., and Anderson, J. R. 1994. Knowledge tracing: Modeling the acquisition of procedural knowledge. User Modeling and User-Adapted Interaction 4, 253–278. https://doi.org/10.1007/BF01099821

[R6] Krichene, W., and Rendle, S. 2020. On Sampled Metrics for Item Recommendation. In Proceedings of the 26th ACM SIGKDD International Conference on Knowledge Discovery & Data Mining (KDD '20), 1748–1757. https://doi.org/10.1145/3394486.3403226

[R7] Kalibera, T., and Jones, R. 2013. Rigorous Benchmarking in Reasonable Time. ISMM 2013, 63–74. https://doi.org/10.1145/2464157.2464160

The initial literature review and access notes are recorded in RELATED_WORK.md. R3 and R6 metadata were checked against Crossref on 25 November 2026. The review is focused, not systematic, and does not establish an exhaustive novelty claim.

## Supporting research records

The registered questions are retained in the user-supplied Version 3, section 3.3. Relevant research and content-scope paragraphs with a source hash are retained in sources/version-3/research-scope-extract.md. Implementation inspection distinguishes initial planning, evidence-triggered recalculation and official achievement handling. The framework preparation revision is 2220fc2e48e69e685b3f714f24522f4c04e228a1; it is not a substitute for a frozen experimental source manifest.

The three protocol files, expert annotation guide, pilot plan, data and reproducibility rules, templates and diagnostic audit accompany this framework. The Vietnamese HUONG_DAN_THUC_HIEN_RESEARCH.md explains the reading order, practical next steps and storage locations for the team. Pilot outcomes are reported in RESEARCH_MANUSCRIPT.md; this framework does not report final experiment outcomes.
