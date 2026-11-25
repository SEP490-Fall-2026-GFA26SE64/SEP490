# Seven day preparation and pilot plan

Updated 23 November 2026. Use Day 1–7 relative to the team's agreed start; no calendar start or completed milestone is inferred. Target: research framing, protocols and feasibility pilots, not guaranteed final results for all three RQs. The current delivery prepares documents only; RQ2 code repair and experiment execution require their concrete implementation plan.

## Work sequence and outputs

| Day | Work | Owner role | Observable output |
|---|---|---|---|
| 1 | Read framework, verify registered RQs, review sources and current RQ2 audit; resolve supervisor terminology concerns | Research lead + supervisor | Agreed scientific scope and tracked open issues |
| 2 | Audit Application Developer requirements/modules/prerequisites; check candidate coverage; design deterministic dataset split and real RQ2 graph generator | Domain experts + data owner | Catalog issue list, proposed manifests, bounded RQ2 implementation revision |
| 3 | Independently label 5–10 development pilot profiles and measure effort; implement approved narrow RQ2 repairs if authorized | Experts + implementation owner | Pilot label records, coverage decision, measurement correctness checks |
| 4 | Run RQ1 pilot adapters and hand-metric checks; validate RQ2 actual scales and directed fixtures | Evaluation owner | Candidate parity/metric evidence, graph and fixture validation |
| 5 | Trace runtime recalculation branches and resolve ASSESSED_SATISFIED policy; review simulator assumptions | Domain owner + experts | Policy/version decision and parity cases; simulator parameter review |
| 6 | Run bounded RQ2 pilot (100 timed queries per scale) and RQ3 mechanics pilot (10 learners); expert gold50 labeling may proceed after rubric/algorithm freeze | Evaluation owner + experts | Raw pilot artifacts, failure/censoring report, real annotation progress |
| 7 | Recompute metrics, check repeatability, review threats, update documentation and decide final-run readiness | Research lead + reviewers | Pilot report and final protocol revision, or explicit blockers |

Days are planning slots, not promises. Catalog review, code/environment readiness or expert effort can move the schedule. Do not weaken evidence rules to claim completion in one week. Expert capacity for 50 profiles has been reported; actual candidate workload is confirmed through the pilot.

## Pilot minimum checks

**RQ1:** distinct pilot/test IDs; common candidate catalog; specification clarity; no algorithm labels in reviewer view; disagreement/effort report; HR vs Recall hand example; tie/zero-vector/empty behavior; primary and exact-match-control outputs distinguished.

**RQ2:** positive research-instance identity; real observed node/edge counts; correct directed path semantics; 3–5-hop BFS/Cypher parity; absent endpoints and two-hop shortcut rejected; no simulated timing arithmetic; every measured sample exported; raw-derived aggregates; UI/API checks after changes. Do not operate on the ordinary development graph for scale setup.

**RQ3:** same initial learner state and observation interface; hidden state excluded from policy; same costs/scoring/retries; deduplicated evidence; baseline/waiver/assessment-satisfied distinction; blocked cases preserved; fixed seed state reproducibility; no-prerequisite/equal-state controls; demonstrate that either policy can tie or lose under declared conditions.

## Freeze decisions still required

| Gate | Decision to record before final experiments | Evidence needed |
|---|---|---|
| P1 | Final reviewed catalog and Level/gap strata | Specification review, mapping audit, actual counts |
| P2 | Annotation coverage and adjudication procedure | Pilot reviewer effort/disagreement; no outcome-driven sampling |
| P3 | Graph/CBF ranking, preprocessing and tie settings | Development checks; no gold50 tuning |
| P4 | RQ2 generator topology, seeds, warm-up/repeats and environment | Correct scale/path validation, stability observations |
| P5 | ASSESSED_SATISFIED and official-evidence policy interpretation | Approved domain rule and real service trace agreement |
| P6 | Simulator costs, probabilities, learning rates and horizon | Expert review plus bias/sensitivity pilot |
| P7 | Final inference plan and artifact completeness | Valid statistical units, missingness policy, manifests |

All P1–P7 are **pending** at creation. Proposed numerical values in protocols are starting designs, not frozen confirmed parameters. The document package can be complete while these empirical gates remain pending.

## Exit criteria for the preparation week

Complete preparation means the English framework, literature map, protocols, guide and evidence organization are usable and unresolved empirical questions are explicit. Complete pilot means real records demonstrate mechanics and feasibility, with failures retained. A pilot finding requiring repair is a useful result, but does not make the final RQ passed. No-positive-effect is not a failure of scientific reporting.

Current measured evidence is only the [old-service RQ2 diagnostic audit](evidence/rq2/20261122-current-service-audit/RESULTS.md). RQ1/RQ3 and corrected three-scale RQ2 pilots remain not run. Do not copy that diagnostic audit into final result tables.

## Catalog preparation completed

A [draft catalog](data/rq1/application-developer-v0.1/README.md) now contains 20 skills, 72 module specifications and 31 prerequisite edges, with structural checks. P1 remains pending real expert review. Version 3 excludes full-course authoring; review descriptions and outcomes. No profiles, pilot annotations or final RQ1 runs were produced by catalog preparation.
