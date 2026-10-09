# RQ3 paired pathway scenarios, v1

This folder contains a synthetic fixture for comparing static and adaptive
pathway strategies over 100 simulated learners. It is an input dataset, not a
record of real learning or a completed benchmark run.

Regenerate it from the repository root with:

```bash
python3 documents/dataset/generate_rq3_scenarios.py
```

The default seed is `42`. Use `--seed N` for a separate reproducible fixture,
`--file PATH` to select the ontology workbook, or `--output-dir PATH` to choose
another output folder. The JSON records the seed and SHA-256 of its source
workbook.

`rq3_scenarios_100_v1.json` contains 100 newly generated RQ3 learners, using the
RQ1 V9 profile-generation mechanism and 40% SE / 30% DATA / 30% AI distribution.
The RQ3 users have separate IDs and are not copied from the RQ1 population.
Profiles are prerequisite-consistent; 30% per domain have 2–4 cross-domain
strengths. The file includes the active target-role requirements and active
module teaching outcomes and entry requirements needed to interpret scenarios.

Each learner has one scenario with:

- A static curriculum fixed from the initial profile before module failures
  are generated. The greedy route reduces observed required-skill gaps and
  includes only modules whose entry requirements are met initially.
- A pre-authored fallback for each route module when an eligible alternative
  exists. On failure the static method uses that fallback once, without
  replanning or chaining another fallback. It then continues its fixed route.
- A potential success/failure outcome for every active module, including
  modules outside the static curriculum. The same learner/module outcome is
  used by either comparison arm, giving paired scenarios. Each potential
  outcome is deterministic for the seed and has 20% failure probability; the
  finite realized failure percentage will not necessarily equal exactly 20%.
- Initial gap, target-hit, unknown-skill, and residual-gap diagnostics.

The agreed synthetic transition applies `TEACHES.outcomeMastery` on success:
the skill becomes `max(currentMastery, outcomeMastery)`, or `outcomeMastery` if
previously unknown. Failures do not change mastery. This assumption must not be
presented as observed learning evidence.

For evaluation, use the mean positive target shortfall across observed required
skills as the primary gap measure. Keep unknown required skills separate, and
also report observed target-hit rate, unmet skill count/codes, residual initial
gaps, total assigned modules, and remedial module counts. A lower module count
alone does not establish valid competency coverage. No retry model is included;
the scenario gives one first-attempt potential outcome per learner/module.

The generator performs structural checks for learner counts, domain balance,
known module references, complete potential-outcome coverage, and fixed route /
fallback eligibility. The RQ3 feature decision record is in
[`Create RQ3 Dataset.md`](../../../features/Benchmark%20dataset%20creation/Create%20RQ3%20Dataset.md).
