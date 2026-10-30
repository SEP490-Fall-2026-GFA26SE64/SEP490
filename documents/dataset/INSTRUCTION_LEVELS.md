> Historical v0.10 instructionLevel representation. Current v0.11 replaces it with [teachingFocus and difficultyLevel](TEACHING_FOCUS_DIFFICULTY.md). This document and its numeric migration rules are not the current import contract.

## Instruction level per Module–Skill — 2026-10-27

TEACHES now stores required `instructionLevel` as a case-sensitive text enum: `FOUNDATIONAL`, `INTERMEDIATE`, or `ADVANCED`. It describes the depth of instruction for that particular Module–Skill pair, not a global skill property, learner mastery or guaranteed gain. Six node labels/seven relationship types and many-to-many teaching cardinality remain unchanged.

| Stored instructionLevel | Legacy numeric band, after rounding |
|---|---|
| FOUNDATIONAL | 0.0–0.3 |
| INTERMEDIATE | 0.4–0.6 |
| ADVANCED | 0.7–0.9 |

User-approved conversion rounds the old number to one decimal using decimal ROUND_HALF_UP before classifying: 0.35 → 0.4 → INTERMEDIATE; 0.65 → 0.7 → ADVANCED. This is a one-time review-data conversion, not a content scoring rule. New graph records accept only the three exact text values; numeric strings, numbers, missing/blank/unknown values and retired property names are rejected. Numeric bands are explanatory metadata, not additional graph properties.

All 181 TEACHES pairs are populated: 14 FOUNDATIONAL, 80 INTERMEDIATE and 87 ADVANCED. The same MS-DE06 skill is FOUNDATIONAL in MOD-DE-J-MODEL-01 and INTERMEDIATE in MOD-DE-J-QUAL-01; the values coexist independently. The current sample definitions remain NEEDS_EXPERT_REVIEW. No arithmetic sum, averaging, normalization or implicit numeric backend ranking applies to these categories.

Workbook comparison view: **Instruction Levels**, with Module/Skill IDs, names and the text level linked to its TEACHES record. The original numeric source manifest is historical provenance outside Neo4j; the current conversion manifest records exact old-to-new values per pair. Duration/price, all other node/edge data and the pinned v0.9 runtime seed are unchanged. This design/review update does not deploy or migrate the running application. Future assignment of instruction levels to new content still requires expert authoring/review.

## Files and reproducibility

- Current seed: [ontology_seed-v010.json](import/ontology_seed-v010.json).
- Current per-pair conversion audit: [module_instruction_levels_v010.json](sources/local_review/module_instruction_levels_v010.json).
- Preserved numeric source: [module_skill_oc_v010.json](sources/local_review/module_skill_oc_v010.json), historical input only, not graph properties or the current import contract.
- One-time conversion helper: [instruction_levels.py](import/instruction_levels.py). It rejects nonfinite/bool/string values and numeric sources outside [0,0.9]. The current graph validator accepts only text enum values and never performs implicit numeric conversion on import.

## Manual checklist

| Target / prerequisites | Steps | Expected |
|---|---|---|
| ontology_dataset.xlsx in a spreadsheet viewer | Open TEACHES and Instruction Levels; filter MS-DE06 | Column J is instructionLevel text. MODEL-01 is FOUNDATIONAL; QUAL-01 is INTERMEDIATE. Comparison cells link to the exact pair. |
| Same workbook | Inspect source pairs previously 0.35/0.65 against the conversion audit | 0.35 becomes INTERMEDIATE; 0.65 becomes ADVANCED. No numeric value remains in the current graph sheets. |
| diagrams/neo4j.svg in a viewer | Inspect TEACHES property note | instructionLevel is an Enum/String with three exact values; numeric bands describe legacy conversion only. |
| Optional isolated graph, http://localhost:7479/browser/ | Follow NEO4J_IMPORT_GUIDE.md, import into an empty review instance, query t.instructionLevel | 181 populated text values, counts 14/80/87; Module/Skill pairs independent; no change to current runtime database. |

Local verification: run `python3 documents/dataset/import/test_dataset.py` and `python3 documents/dataset/import/import_neo4j.py --dry-run`. Full runtime API, database upgrade, Testcontainers and Compose/Playwright acceptance are outside this review-data change and remain unverified.
