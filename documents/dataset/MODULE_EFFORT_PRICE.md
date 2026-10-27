# Module duration and paid-package estimates

Date: 2026-10-27. Applies to the v0.10 review workbook and `import/ontology_seed-v010.json`, REQ-013-F01/F03 and REQ-016-F01/F02. All estimates remain NEEDS_EXPERT_REVIEW. The pinned v0.9 runtime seed is unchanged.

## Meaning and comparison

- `duration`: positive integer minutes of expected learner effort, including reading, practice, integration and reflection. It is not video runtime or a mastery guarantee.
- `price`: positive VND price for the complete paid learning package. Public linked resources can be freely accessible; the estimate prices the packaged lesson/practice support, not access to those resources. No vendor quote, billing charge or observed market price is claimed.
- Count a selected Module once even if it teaches several missing skills. Do not multiply its duration or price by the number of skills or normalize either by OC. The estimate does not implement backend selection, billing or an OC scoring rule.
- These values provide differentiated sample inputs for comparison. They do not validate an optimization algorithm, prove suitability for a learner or establish an empirical cost-effectiveness ranking. Equal values are allowed when estimated effort/support is equivalent.

## Reproducible authoring assumptions

The [estimation utility](import/estimate_module_costs.py) assigns a base exercise effort to every mapped skill (60–180 minutes), reflecting the task's artifact and technical scope. For example: metadata documentation 60 minutes, source control 90, data modelling 120, warehouse implementation 150, infrastructure automation/security incident practice 180. These are authoring assumptions based on existing task descriptions, not measured times.

For lesson/practice packages, Junior/Middle/Senior task effort factors are 1.00/1.35/1.75, reflecting guided implementation, independent work and complex review respectively. Add 30 minutes orientation, 30 minutes integration per additional skill, and 30 minutes reflection (45 for the validation/troubleshooting second module). Reading/practice packages use factor 1.00, 30 minutes orientation and 30 minutes reflection. Round total effort up to 15 minutes.

Paid-package estimates use assumed hourly rates of 55,000/75,000/100,000 VND for Junior/Middle/Senior packages. Reading/practice support uses 50,000–75,000 VND/hour by subject. Add a subject exercise-package fee of 20,000–60,000 VND and round upward to 10,000 VND. Higher difficulty does not imply higher OC; no OC is consumed by this calculation.

`duration = ceil_to_15(orientation + sum(skill exercise effort) × task factor + integration + reflection)`

`price = ceil_to_10000(duration / 60 × assumed hourly rate + exercise-package fee)`

The [per-module manifest](sources/local_review/module_effort_price_v010.json) records every skill effort, task factor, component time, rate, fee, content reference/hash and resulting duration/price. Provenance and estimation inputs remain outside Neo4j. Recompute/review if tasks change. Updating estimated inputs is a dataset authoring operation; it is not a fixed business rule for future real catalog pricing.

## Result and examples

85 Modules have **31 distinct durations, 150–915 minutes**, and **54 distinct prices, 150,000–1,560,000 VND**. No price is zero. OC has separate illustrative values per Module–Skill pair; the scoring decision remains deferred.

| Module | Skills | Duration | Price (VND) |
|---|---:|---:|---:|
| MOD-DE-J-MODEL-01 | 3 | 450 minutes (7.5 hours) | 480,000 |
| MOD-DE-J-MODEL-02 | 2 | 375 minutes (6.25 hours) | 410,000 |
| MOD-DE-J-PIPE-01 | 3 | 510 minutes (8.5 hours) | 530,000 |

## Verification and manual review

Run `python3 documents/dataset/import/test_dataset.py` and importer `--dry-run`. Verify positive finite prices, positive integer durations, reproducible manifest equality, variation and greater effort/cost for deeper versions of the same skill package. All six entity and seven relationship workbook sheets must equal JSON records.

Manual prerequisite: open `ontology_dataset.xlsx` in a spreadsheet viewer. Inspect LearningModules columns L/M against the examples above and other Junior/Middle/Senior variants. Expected: numeric minute/VND values, no zero prices, varied estimates and retained review status. Optional isolated graph URL: http://localhost:7479/browser/ using [import instructions](NEO4J_IMPORT_GUIDE.md); inspect m.duration/m.price. This is not a migration of the current runtime graph.
