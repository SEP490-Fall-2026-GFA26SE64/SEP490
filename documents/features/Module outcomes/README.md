# Module Outcomes

**Ontology 0.9.0 (approved 2026-10-26):** LearningModule–MicroSkill uses many-to-many TEACHES. Each Module teaches at least one skill; each catalog skill has at least one teaching Module; duplicate pairs are rejected. Course is removed. Learning objectives and assessment evidence may be authored in content/assessment documentation; expectedOutcome and rubric/readiness-assessment references are not graph properties; the v0.10 correction below adds instructionLevel text to TEACHES. Both sides of the mapping must be checked when publishing or replacing a module. Earlier one-to-one mapping rules are superseded. Module completion does not prove mastery of every linked skill.


## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-016. **Actor:** Expert. **Status:** Detail draft.
Define/update module-to-micro-skill mappings within assigned disciplines. Mappings support pathway recommendations and independent skill discovery; new/revised offerings remain subject to L&D approval.

## Historical Specification
Use the alignment above where older details conflict.

Map dummy learning modules to the micro-skills they are intended to develop.

**Source:** [REQ-016](../../PRODUCT_OVERVIEW.md)  
**Actor:** Domain Expert

## Functions

- [Define Module Outcome Skills](Define%20Module%20Outcome%20Skills.md)
- [Update Module Outcome Skills](Update%20Module%20Outcome%20Skills.md)

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

See [conversion details](../../dataset/INSTRUCTION_LEVELS.md) and [current tests/manual checks](../../testing/system/REQ-016-instruction-level.md).
