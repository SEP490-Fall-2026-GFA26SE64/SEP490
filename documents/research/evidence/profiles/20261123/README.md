# RQ1 synthetic profile preparation evidence

Date: 23 November 2026. Scope: draft offline dataset and blank expert annotation templates. No production/database mutation, recommendation scoring or expert labeling.

## Results

- 500 distinct profiles; 450 development / 50 held-out inputs; pilot10 is a development subset.
- Development role strata: 150 Junior, 150 Middle, 150 Senior. Gold inputs: 17, 17, 16.
- Target requirements, skill/version references, simulated official evidence and baseline outcomes checked independently against the pinned catalog.
- Initial learning needs recomputed from evidence; baseline passes never create official achievement. No unassessed prerequisite expansion.
- No duplicate same-role need sets. Maximum pairwise same-role gap-set Jaccard 0.75, below the predefined 0.8 rejection threshold. This is not a semantic-independence guarantee.
- Six corrupt-input fixtures rejected: split overlap, pilot leakage, incorrect gap, baseline achievement conversion, incompatible version and false gold status.
- Two independent blank reviewer templates each contain 3,600 profile/module rows with null grades, identities and timestamps; 50 adjudication templates are also blank.
- Complete deterministic rebuild in a separate temporary directory was byte-identical. Existing output directory is refused before mutation; overwrite protection was exercised.
- Current Markdown links and research whitespace checked.

[validation.json](validation.json) and [reproducibility.json](reproducibility.json) retain actual check results. Reproduce with tools/validate_rq1_profiles.py; use tools/build_rq1_profiles.py --output NEW_DIRECTORY for a fresh build. Execution used the bundled Python runtime.

## Interpretation and next gates

This prepares 50 gold inputs, not verified golden answers. Human judgments = 0. Expert catalog/profile review, pilot effort/coverage choice, algorithm freeze, independent labeling and adjudication remain pending. No-gap, certificate-only, conflicting-evidence or missing-provision robustness cases are not represented by this positive-query cohort. Runtime parity with full admission/history logic has not been executed; only the target-group rule has been inspected in RequirementPathwayAdmissionService. No claim that algorithmic correctness or relevance is established by data validation.
