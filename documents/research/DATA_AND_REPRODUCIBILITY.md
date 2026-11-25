# Data contracts and reproducibility

Version 0.2, 23 November 2026. All research documents, reviewed data versions, annotations, scripts, manifests and outputs are stored under `documents/research`. Normal application source remains with its existing owners; research manifests reference its version. This document defines future artifact contracts; a directory/template is not evidence of generated data or a completed run.

## Layout and provenance

```text
research/
  README.md
  HUONG_DAN_THUC_HIEN_RESEARCH.md
  RESEARCH_FRAMEWORK.md
  Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx
  RELATED_WORK.md
  RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md
  RQ2_GRAPH_LATENCY_EXPERIMENT_2.md
  RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md
  EXPERT_ANNOTATION_GUIDE.md
  PILOT_PLAN.md
  DATA_AND_REPRODUCIBILITY.md
  templates/                    # Empty schemas/forms, not collected evidence
  data/<rq>/<version>/           # Future frozen datasets and annotations
  results/<rq>/<run-id>/         # Future real run artifacts
  RESEARCH_MANUSCRIPT.md / .docx  # Manuscript draft (docx built with pandoc, git-ignored)
  data/rq1/application-developer-v0.1/  data/rq1/profiles-v0.1/  data/rq3/pilot-v0.1/
  results/rq1/<run-id>/  results/rq2/<run-id>/  results/rq3/<run-id>/
  evidence/{catalog,profiles,rq1,rq2,rq3}/<date>/  # Verification records, not results
  tools/                        # Builders, validators and runners (see README.md)
```

Never overwrite a frozen dataset or historical run. Record a new version and the reason for change. Use relative paths and SHA-256 checksums. Store only consented/pseudonymous expert IDs; real names/contact details and credentials do not belong in public artifacts. Keep restricted annotation material in an access-controlled research location if needed and publish a sanitized manifest. “All under research” does not authorize public release of personal data or third-party copyrighted resources.

## Required fields

| Artifact | Required fields | Allowed nulls and validation |
|---|---|---|
| Dataset manifest | datasetId/version, source provenance, schema version, generator commit/hash, seed, createdAt, files/checksums, actual counts | human review metadata stays null until real review; no guessed dates or identities |
| RQ1 profile | profileId, synthetic org ID, Role ID, Level ID, target requirement array, baseline observations, official evidence array, split | Empty evidence is valid; requirement version cannot be missing where provision/evidence compatibility requires it |
| Module snapshot | ID, revision, contentVersion, teaching binding, Skill version, knowledge level, title/description/outcomes/scope, benchmark availability and separate application release/access state | Description may be unavailable but must be flagged; missing mandatory specification fields block benchmark freeze; full lessons are not required and application release is never inferred |
| Expert annotation | protocolVersion, datasetVersion, reviewerId, profileId, moduleId, grade, reason, annotatedAt | grade may be null only for unjudged/insufficient-information state; preferredRank null unless chosen; no synthetic timestamps for human acts |
| Adjudication | both original annotation references, disagreement, resolution grade/reason, actual adjudicator and time | Unresolved remains null; never overwrite original labels |
| RQ2 fixture | dataset hash, source ID, target ID, expected shortest hops, directed relation scope, pair ID | Hops must be 3–5; endpoints distinct, unique and in selected snapshot |
| RQ2 raw sample | runId/block/iteration, pairId, raw elapsed nanoseconds, returned count, actual hops, status/error | actual hops null for no path; error null on success; failed samples remain present |
| RQ3 event | runId/seed/learner/policy, action index/type, cost, observed outcomes, revision/evidence deltas, distance, budget, stopped reason | No invented achievement ID; terminal reason nullable before stopping; hidden state separate from policy inputs |
| Run manifest | experiment/protocolVersion, status, dataset/fixture hashes, engine commit and relevant dirty diff hash, environment, parameters/seeds, commands, raw/summary hashes | startedAt/finishedAt null before execution; template cannot have status PASSED or real-result values |

Use `templates/run-manifest.example.json` as a field guide. All null required runtime values must be populated before an actual run is accepted. A hash of relevant dirty source is needed when the checkout is not clean; unrelated local changes are recorded but not attributed to the experiment. Do not attach confidential source/env contents merely to satisfy provenance.

## Freeze and rerun

1. Catalog audit: record module specification clarity and version compatibility; review Role requirements and prerequisite semantics.
2. Split freeze: create distinct profile IDs, split without duplicate leakage, record hashes before final label exposure.
3. Protocol freeze: lock algorithms, candidate policies, metrics, seeds, simulator assumptions and failure handling. Record pilot-informed changes explicitly.
4. Gold freeze: retain independent ratings and adjudication; do not tune on final labels. If labels remain partial, publish the coverage limitation and only valid metrics.
5. Run: execute against exact versions, preserving raw errors and every observation.
6. Recompute: derive summaries from raw artifacts; verify counts, definitions and paired cohorts independently.
7. Rerun: deterministic ranking/state generation must match under fixed inputs/seeds. Performance timings need not be identical; report repeat variability on equivalent environments.

## Scientific status vocabulary

- **Proposed:** a documented design not yet executed or parameter-frozen.
- **Pilot:** an exploratory feasibility run; cannot silently become a final test after tuning.
- **Final:** a run using the frozen protocol and independent evaluation data, regardless of whether the proposed method wins.
- **Failed:** executed but a correctness or validity criterion failed. Retain all evidence.
- **Blocked / Not run:** missing prerequisites or not executed. Neither means passed.

The existing RQ2 audit executed successfully as a diagnostic invocation but failed scale/fixture validity. Its JSONs contain transformed response values and incomplete timing exports; preserve that limitation rather than relabeling them raw full-scale measurements.

## Acceptance gates

| Gate | Observable evidence | Current status |
|---|---|---|
| D1 Reviewed catalog | Expert review of requirements, mappings, prerequisites and synthetic module specifications | Pending |
| D2 Independent gold | Pilot effort assessed; final judgment coverage fixed; real labels/adjudication | Pending |
| D3 RQ2 measurement integrity | Real isolated scale graphs, validated fixture distances, all unaltered timings | Partial: real isolated graphs and Cypher-validated 3/4/5-hop fixtures; exports keep only 30 of 100 timings |
| D4 RQ3 policy/model validity | Resolved ASSESSED_SATISFIED policy, runtime trace parity, expert model review | Policy and parity done; expert review pending |
| D5 Scientific reproducibility | Complete manifests, raw-to-summary checks and rerun reports | RQ1 and RQ3 have manifests with SHA-256 and reruns; RQ2 has repeated rounds without full raw samples |
| D6 Document package | Reference/link/content checks and rendered Word review | Relative links checked on 25 November 2026; rendered Word not reviewed |

No application tests or production-readiness claims are implied by D6.

## Current draft catalog

[data/rq1/application-developer-v0.1](data/rq1/application-developer-v0.1/README.md) contains a synthetic catalog only. Structural validation passed; expert review and freeze remain pending. The 500-profile dataset is in [profiles-v0.1](data/rq1/profiles-v0.1/README.md). Per-group skill versions and outcomes are research-specific and not assumed API-import compatible.
