# Learning Module Management

**Ontology 0.9.0 (approved 2026-10-26):** LearningModule–MicroSkill uses many-to-many TEACHES. Each Module teaches at least one skill; each catalog skill has at least one teaching Module; duplicate pairs are rejected. Course is removed. Learning objectives and assessment evidence may be authored in content/assessment documentation; learningOutcome/expectedOutcome and rubric/readiness-assessment references are not graph properties. Both sides of the mapping must be checked when publishing or replacing a module. Earlier one-to-one mapping rules are superseded. Module completion does not prove mastery of every linked skill. No per-pair skill weighting or automatic mastery gain is added.


## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-013. **Actor:** Expert. **Status:** Reclarification required.
Create/update/view/organize modules in assigned disciplines, map their skill outcomes, and submit new/revised modules to L&D for approval. Dummy-only content and immediate authoring-to-Employee availability are superseded. Removal/history and approval versioning remain open.

## Historical Specification
Use the alignment above where older details conflict.

Maintain dummy learning items used by the recommendation engine.

**Source:** [REQ-013](../../PRODUCT_OVERVIEW.md)  
**Actor:** Domain Expert

## Functions

- [Create Learning Module](Create%20Learning%20Module.md)
- [View Learning Modules](View%20Learning%20Modules.md)
- [Update Learning Module](Update%20Learning%20Module.md)
- [Delete Learning Module](Delete%20Learning%20Module.md)