# Update Module Outcome Skills

## Current Scope Alignment
Expert updates taught-skill mappings in assigned discipline scope; learning/approval/version effects must be agreed. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-016-F02  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Module Outcomes](README.md)

## Description

Modify an authorized module's outcome mappings, including adding, changing, or removing intended skills.

**Input:** Existing outcome mappings and requested changes.  
**Outcome:** Updated teaching relationships under the agreed version policy.

## Open Decisions

- Removal constraints and checks against associated assessment coverage.
- Effect on existing pathways and previously assessed module attempts.
- Publication, concurrent edits, and historical mapping retention.

## Acceptance Baseline

An outcome update does not silently reinterpret the skill evidence from a previous assessment attempt.

## Confirmed teaching cardinality — 2026-10-26

User approved many-to-many TEACHES. Inputs are one Module and a non-empty set of existing MicroSkill IDs; one skill may belong to several Modules. Preserve every architecture-defined node/edge field and review state; reject duplicate pairs, wrong endpoints and loss of required teaching coverage. Suitable providers are selected for gaps and role/Level context; do not require all alternatives or infer mastery from a Module completion. No learner evidence, historical pins or assessment item content is rewritten by this catalog change. Publication/authorization/version transition policy remains open. See [test evidence and manual checks](../../testing/system/REQ-016-many-to-many-teaching.md).

## Confirmed OC and metadata design — 2026-10-27

REQ-016-F01/F02: preserve many-to-many TEACHES and add required numeric outcomeCoverage (OC) per pair. OC values are independent in [0,1]; 0.5/0.6/0.7 for three taught skills are valid together, with no normalization. Larger OC indicates stronger teaching emphasis or skill depth/difficulty in that Module. OC calculation rules remain deferred and OC never proves learner mastery. LearningModule gains duration (positive integer minutes) and price (positive VND for this paid-module dataset); Level.context is removed. v0.10 is a design/review dataset change, not implemented runtime CRUD/publication. Illustrative seed values remain NEEDS_EXPERT_REVIEW. See [current schema](../../neo4j_schema.md) and [manual checks](../../testing/system/REQ-016-oc-module-metadata.md).


## Same skill, different Module OC — 2026-10-27

OC is a property of the existing TEACHES relationship, keyed by the exact (moduleId, skillId) pair, not a shared property on MicroSkill or LearningModule. The schema remains six node labels and seven relationship types; the diagram's TEACHES property box is not an extra graph node.

| Module | Skill | TEACHES.outcomeCoverage (OC) |
|---|---|---:|
| MOD-DE-J-MODEL-01 | MS-DE06 — Maintain metadata documentation | 0.2 |
| MOD-DE-J-QUAL-01 | MS-DE06 — Maintain metadata documentation | 0.5 |

Both rows coexist: the quality/operations package emphasizes that skill more strongly in this illustrative fixture. Neither value overwrites the other. Do not sum or normalize values, assume all providers of a skill have equal OC, or infer learner mastery. Actual OC assignment rules remain deferred. There are 181 explicit illustrative samples; their source manifest is outside Neo4j. Duration and price remain unchanged by this correction.

Excel now includes a formula-linked **Outcome Coverage** comparison view with Module ID/title, Skill ID/name and each pair's OC, grouped by skill. The original TEACHES sheet remains the exact import records. The comparison view is not a new node or import section.
