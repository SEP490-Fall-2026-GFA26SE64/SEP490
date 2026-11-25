# Experiment 1 Recommendation relevance

Protocol version 0.2, updated 25 November 2026. **Status: executed on the 50 held-out Application Developer profiles against the 72-module catalog and consensus priority shortlist ([RQ1_Golden_Set_50_Dong_Thuan.xlsx](RQ1_Golden_Set_50_Dong_Thuan.xlsx)); interactive benchmark UI verified at `/platform-admin/rq1-benchmark`.**

## Registered question

> How does the Recommendation Relevance (Hit Rate@5) of the Graph-Traversal algorithm compare to a baseline Content-Based Filtering approach for matching learning modules to skill gaps?

Source: [Version 3 research extracts](sources/version-3/research-scope-extract.md). Wording is unchanged. This protocol operationalizes initial module relevance, not actual learning gain.

## Study population and common inputs

One case: Application Developer, Junior/Middle/Senior. Create 500 distinct synthetic profiles: 450 development profiles and 50 held-out expert-labelled profiles. Select 5–10 pilot profiles from the 450, never from the final 50. Two or more real reviewers independently label the pilot and final profiles. Availability is reported by the project owner; no labels or expert approvals have yet been collected in this package.

Snapshot each profile after baseline and before Expert pathway review. Record synthetic organization/profile identity, selected Role/Level, exact Skill–knowledge–version requirements, compatible official evidence and baseline group outcomes. Derive initial learning needs through the current owner; a baseline pass is diagnostic, not official achievement. Do not expand unassessed prerequisite closure or consume Expert selections as model input. Primary module evaluation uses profiles with module-based needs; no-gap, missing-provision and certificate-only cases are retained in a separate coverage/robustness report.

Freeze a common candidate catalog of all benchmark-eligible same-organization synthetic module specifications with coherent versions. A later application adapter must also verify actual release and access conditions; benchmark eligibility never fabricates application publication. Do not prefilter this universe by exact profile gaps for the primary comparison. A module's revision/content version is pinned; repeated revisions are not duplicate recommendations. Existing catalog lookup filters by requested Skill and therefore needs a research export adapter, not blind reuse as the common candidate universe.

Stratify by Level, gap count and evidence history; freeze actual stratum counts after the catalog audit. Detect duplicate/near-duplicate requirement-and-evidence vectors before splitting. Do not count copied organization catalogs as independent domains. The observed development seed contains 270 documents, 237 Skill–knowledge pairs and 79 Skills, with 204 pairs having one module and 33 having two; these are seed observations, not final candidate counts. Those broader seed counts are historical context, not Application Developer counts. The rebuilt [catalog](data/rq1/application-developer-v0.1/README.md) has 20 skills and 72 specifications. Review specification suitability before freeze; complete lessons are outside scope.

## Proposed reproducible algorithms

The following are explicit v0.1 design proposals to pilot and freeze, not descriptions of an already implemented top-five model.

**G0 structured graph matching.** Traverse selected Role/Level requirements and verified module teaching mappings. Score a candidate 1 if its exact Skill–knowledge–version binding matches an established unmet initial requirement; otherwise score 0. Rank by score descending, then by a seeded hash of profile ID and module ID ascending. Seed and hash definition must be identical across reruns and shared for score ties in CBF. Return five distinct candidates when at least five exist. Nonmatching fill-ins remain visible and count against relevance; never fabricate additional valid modules. Keep traceable mapping reasons.

G0 is intentionally simple: it exposes the value of structured matching without inventing weights for centrality, time, price or mastery. It does not optimize a curriculum or prove a contribution from deep prerequisite traversal. Initial generation continues to retain all eligible alternatives in the application.

**C0 content-based filtering.** Fit TF-IDF on the frozen module corpus only. Proposed settings: English text, lowercase, word unigrams/bigrams, L2 normalization, no label-trained weights. Use module title, learning outcomes, scenario description and an explicit knowledge-level label. Build each gap vector from its skill name/description and level; average gap vectors with equal weight and normalize. Rank by cosine similarity and the same seeded tie rule. Document zero-vector cases; use the tie rule rather than invented scores. Audit language and text completeness before selecting final preprocessing. [T2](RELATED_WORK.md) describes the underlying library.

Remove machine IDs, embedded relation IDs and repeated seed/status boilerplate with one documented preprocessing rule. Keep genuine skill names and meaningful specification text: similarity on natural names is not itself leakage. Do not use graph edges, hidden labels or expert preferred ranks in C0. Fit neither preprocessing choices nor ranking parameters on gold50.

**Secondary control.** Apply the same exact-match filter to both G0 and C0, then compare their ordering within valid candidates. Report separately, including lists shorter than five. This distinguishes structured mapping effects from within-valid-set ranking. A seeded random catalog ranking may be added as a clearly labelled sanity check; no additional neural baseline is claimed.

## Human judgment and leakage controls

Use [EXPERT_ANNOTATION_GUIDE.md](EXPERT_ANNOTATION_GUIDE.md). Ratings: 0 irrelevant, 1 supporting, 2 directly suitable; grade 2 defines the relevant set. Up to five preferred modules are recorded separately, with equivalent acceptable modules allowed. Expert judgments inspect module descriptions, outcomes and scope, not an algorithm's output or a prefilled TEACHES answer key. Keep each independent rating and adjudication history.

**Open gate A1:** use the pilot to measure annotation effort, then choose complete-catalog judgments or a documented coverage strategy before official evaluation. Ranking candidates must remain the full common catalog even if judgments are pooled. No unjudged item becomes grade 0. If using a blind pool, include outputs from all compared methods and a documented control sample, label every returned top-five item, disclose pooling bias, and do not report full-catalog Recall/nDCG without sufficient judgments. Confirm at least one suitable candidate independently for each primary positive-query profile; no-gold-positive profiles are reported separately, not silently dropped after seeing scores. A revised judgment protocol is versioned before scoring the final run.

Pilot labels may refine instructions. Lock the algorithm and rubric before final labels are exposed to developers; record separate expert-label and algorithm-freeze timestamps. If changes are made after test exposure, mark results exploratory and obtain a fresh test set for any confirmatory claim.

## Metrics and analysis

Let P(u) be the returned top-five set and G(u) all grade-2 candidates under the final coverage protocol.

- HR@5 = mean over eligible profiles of `1[intersection(P(u),G(u)) is nonempty]`.
- Precision@5 = mean `number of grade-2 items in top five / 5` for the primary catalog with at least five candidates; missing recommendation slots score zero.
- Recall@5 = mean `hits / size(G(u))`, only where the relevant set is sufficiently judged and nonempty.
- Graded nDCG@5 uses **linear gain** `grade/log2(rank+1)`, divided by ideal DCG from the same judged candidate universe. Grade 1 contributes to graded gain, although it is not relevant for HR. IDCG=0 is reported as not applicable. Do not silently substitute exponential gain or average-tie library behavior for the deterministic ranking.

Example: gold A/B/C/D/E and prediction A/X/Y/Z/W produce a hit of 1, Precision 0.2 and Recall 0.2. This is a metric check, not a research result. HR can saturate in an easy catalog; report complementary metrics and candidate counts rather than selecting only the most favorable metric.

Compute paired G0–C0 differences on the same profiles. Proposed analysis: 10,000 seeded profile bootstrap resamples and 95% percentile intervals, plus win/tie/loss and Level-specific descriptive results. If profiles share a generating template, resample template clusters or disclose dependence. Fifty gold profiles are not 500 accuracy observations; one hit changes HR by two percentage points. Secondary metrics/controls are exploratory unless preregistered. Report no effect or worse performance without changing the success criterion.

## Artifacts and verification gates

Store versions under `data/rq1/<dataset-version>/`, runs under `results/rq1/<run-id>/` (created only when real data/runs exist). Required artifacts: catalog/profiles JSONL, split IDs, catalog review, preprocessing manifest, independent/adjudicated labels, full rankings or scores, per-profile metrics, paired analysis and exclusions. Use [DATA_AND_REPRODUCIBILITY.md](DATA_AND_REPRODUCIBILITY.md).

Before a final run require: exact identity/version/tenant checks; 500 distinct profiles and 450/50 split; pilot/test disjointness; real annotations with no fabricated metadata; metric hand cases; duplicate/zero-vector/tie/no-candidate behavior; full-catalog candidate parity; no label leakage; deterministic ranking rerun. Pilot source and real-adapter mapping must agree. Final readiness is blocked by unresolved A1, module-specification validation or missing labels, not passed by an attractive chart.

## Result boundary and observed shortlist agreement (25 November 2026)

Evaluated against the exact-ID intersection of the two priority shortlists in [RQ1_Golden_Set_50_Dong_Thuan.xlsx](RQ1_Golden_Set_50_Dong_Thuan.xlsx) across the 50 held-out profiles ([RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx)):

| Method | Profiles with at least one match | Hit Rate@5 | Mean exact matches per profile |
|---|---:|---:|---:|
| G0 structured graph matching | 48/50 | 96% | 2.30 out of 5 |
| C0 content-based TF–IDF | 41/50 | 82% | 1.28 out of 5 |
| G0 minus C0 | +7 profiles | +14 percentage points | +1.02 modules |

These figures operationalize agreement with the consensus shortlist (`RESEARCH_MANUSCRIPT.md`, Section 4.1) and do not estimate full-catalog recall across unjudged alternatives. Expert relevance is not learning effectiveness; one Role cannot establish generalization to AI, IoT or all workforce occupations. References and positioning: [RELATED_WORK.md](RELATED_WORK.md).

## Catalog preparation update on 23 November 2026

The Application Developer web full-stack draft is structurally checked but not expert-approved or frozen. Module metadata separates synthetic benchmark availability from application release status; 500 draft profiles are available, with no human gold labels. CBF fields are title, description, learningOutcomes and knowledgeLevel, with the existing preprocessing rules. Exclude IDs, bindings, source/review metadata and excludedScope from CBF features. The documented G0 top-five adapter remains proposed and requires comparison with actual engine outputs; no prerequisite expansion is introduced to make the graph method appear stronger.

## Profile preparation update

[profiles-v0.1](data/rq1/profiles-v0.1/README.md) contains 450 development and 50 held-out inputs sampled with seed 20261123, balanced across role levels and gap/evidence strata. Pilot10 uses development only. The user authorized draft generation before expert catalog freeze; inputs are versioned and pinned, not final approved data. Same-role gap-set Jaccard >=0.8 is rejected across the cohort; this does not establish semantic independence. All 500 cases have 1–9 module-based needs; robustness cases outside this positive-query cohort remain separate future work. Two blank reviewer templates provide all 72 candidate rows per gold profile without prescribing final judgment coverage. No rankings or relevance labels have been generated. Full runtime admission parity remains unverified.
