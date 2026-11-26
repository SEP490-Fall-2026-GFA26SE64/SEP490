# Application Developer catalog preparation evidence

Executed 23 November 2026. Scope: isolated benchmark draft, no database import and no profile generation.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| Explicit full-stack role matrix and knowledge outcomes | Passed for artifact completeness | 20 skills, 60 pairs, 120 outcomes; Junior/Middle/Senior 18/37/49 required groups |
| Module specification coverage | Passed structurally | 72 unique modules; 48 pairs with one option, 12 with two |
| Prerequisite references/direction/no cycles | Passed structurally | 31 edges; pair-level and skill-level DAG checks; initial expansion disabled |
| No fabricated expert approval or app release | Passed | Null human review/publication fields, CANDIDATE benchmark state |
| Validator detects invalid data | Passed | Seven negative fixtures rejected; see validation.json |
| Reproducibility | Passed | Final deterministic rebuild byte-identical, manifest checksums; see reproducibility.json |
| Local Markdown links and whitespace | Passed | No broken current-document local links; git diff --check clean for research |
| Human content validity and freeze | Pending real reviewers | review-items.json and REVIEW_CHECKLIST.md; no approval inferred |
| Adapter/runtime parity, RQ1 final scoring | Not run | Outside this catalog preparation step |
| 500 profiles / expert relevance labels | Not generated | Both counts remain zero |

## Reproduction

From repository root, run the builder and validator in documents/research/tools with Python. The actual execution used the bundled Python at /Users/nguyenan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Validator command: `python documents/research/tools/validate_application_developer_catalog.py --output documents/research/evidence/catalog/20261123/validation.json`.

The build script records its hash and source seed hash in the manifest. Current code is a deterministic assembler of authored specifications, not a learner simulator or recommendation model. Semantic expertise cannot be replaced by these structural checks. No product tests, UI tests or deployment claims are made for this data-only change.
