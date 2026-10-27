# Define Module Outcome Skills

## Current Scope Alignment
Expert maps assigned-discipline modules to taught micro-skills for pathways and independent discovery; approval/version policy remains open. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-016-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Module Outcomes](README.md)

## Description

Define the micro-skills that an authorized module is intended to teach, allowing the recommendation engine to match modules to gaps.

**Input:** Module and intended outcome skills.  
**Outcome:** Module-to-skill teaching relationships.

## Open Decisions

- Instruction-level assignment for new content requires expert review; each existing pair has its own text category.
- Required coverage by assessment questions.
- Minimum outcome count and validation before a module becomes recommendable.

## Acceptance Baseline

Intended outcomes are available to gap-based module selection but do not themselves prove employee mastery.

## Confirmed teaching cardinality — 2026-10-26

User approved many-to-many TEACHES. Inputs are one Module and a non-empty set of existing MicroSkill IDs; one skill may belong to several Modules. Preserve every architecture-defined node/edge field and review state; reject duplicate pairs, wrong endpoints and loss of required teaching coverage. Suitable providers are selected for gaps and role/Level context; do not require all alternatives or infer mastery from a Module completion. No learner evidence, historical pins or assessment item content is rewritten by this catalog change. Publication/authorization/version transition policy remains open. See [test evidence and manual checks](../../testing/system/REQ-016-many-to-many-teaching.md).

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
