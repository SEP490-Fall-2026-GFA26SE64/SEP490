# Module Outcomes

**Ontology 0.9.0 (approved 2026-10-26):** LearningModule–MicroSkill uses many-to-many TEACHES. Each Module teaches at least one skill; each catalog skill has at least one teaching Module; duplicate pairs are rejected. Course is removed. Learning objectives and assessment evidence may be authored in content/assessment documentation; expectedOutcome and rubric/readiness-assessment references are not graph properties; the v0.10 correction below adds numeric OC to TEACHES. Both sides of the mapping must be checked when publishing or replacing a module. Earlier one-to-one mapping rules are superseded. Module completion does not prove mastery of every linked skill.


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
