# RQ1 rerun, 2026-11-25

## What was rerun
The shortlist-agreement evaluation, run headlessly with the engine that backs `/platform-admin/rq1-benchmark`.

**Command (repository root):**
```bash
node documents/research/tools/run_rq1_shortlist_agreement.mjs
```

**Inputs:**
- [RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx](../../../RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx): 50 held-out profiles with baseline results.
- [RQ1_Golden_Set_50_Dong_Thuan.xlsx](../../../RQ1_Golden_Set_50_Dong_Thuan.xlsx): consensus priority shortlist from reviewers EX-9 and EX-10.
- The 72-module catalog fixtures in `frontend/public/fixtures/rq1-catalog/`. These are byte-identical to `data/rq1/application-developer-v0.1/`.

**Consistency checks before the run:**
- The baseline workbook and `gold50-profiles.jsonl` under `frontend/public/fixtures/rq1-samples/` are byte-identical to the copies in this research folder.
- `readTop5Reference` rejected nothing: 50 profiles, unique IDs, every shortlist module present in the catalog, and baseline snapshots equal to the published fixture.

## Results
These match the numbers reported on 24–25 November exactly:

| | G0 | C0 |
|---|---:|---:|
| Hit Rate@5 | 48/50 (96%) | 41/50 (82%) |
| Mean exact matches | 2.30 | 1.28 |

New in this rerun (paired percentile bootstrap over profiles, 10,000 resamples, seed 20261125):
- Paired G0 − C0 Hit Rate@5: +0.14 [+0.06, +0.24].
- Paired mean matches: +1.02 [+0.72, +1.32].
- Paired shortlist recall: +0.288 [+0.210, +0.369].
- Matches per profile: G0 higher on 29, tied on 21, lower on 0.

Full tables are in the [protocol](../../../RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md). Artifacts:
- [report.json](../../../results/rq1/20261125-rerun/report.json)
- [run-manifest.json](../../../results/rq1/20261125-rerun/run-manifest.json), with SHA-256 of the inputs and engine sources.

## Not covered
- The full-catalog graded evaluation (0/1/2 labels for all 72 modules per profile) cannot run. No complete expert evaluation exists.
- `RQ1_Input_2_50_Golden_Expert_Evaluation.xlsx` and `gold50-expert-evaluation.jsonl` are illustrative legacy files that the current two-file flow rejects. They were not used as labels.
