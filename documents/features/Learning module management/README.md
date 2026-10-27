# Learning Module Management

**Ontology 0.9.0 (approved 2026-10-26):** LearningModule–MicroSkill uses many-to-many TEACHES. Each Module teaches at least one skill; each catalog skill has at least one teaching Module; duplicate pairs are rejected. Course is removed. Learning objectives and assessment evidence may be authored in content/assessment documentation; expectedOutcome and rubric/readiness-assessment references are outside graph properties; teachingFocus and difficultyLevel text fields are on TEACHES in v0.11. Both sides of the mapping must be checked when publishing or replacing a module. Earlier one-to-one mapping rules are superseded. Module completion does not prove mastery of every linked skill.


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

## Duration and paid-module estimate correction — 2026-10-27

REQ-013-F01/F03 and REQ-016-F01/F02: LearningModule.duration is expected total learner effort (reading, practice, integration, reflection), in positive integer minutes. LearningModule.price is the positive VND price for the complete module learning package, charged once per selected Module, not per skill. Seed estimates vary by mapped skill effort and task depth; they are not vendor quotes or runtime pricing rules. The 85 paid sample Modules span 150–915 minutes and 150,000–1,560,000 VND. See [method and assumptions](../../dataset/MODULE_EFFORT_PRICE.md). Cost comparisons must deduplicate Modules covering multiple gaps. Teaching focus/difficulty assignment to new content requires expert review. Runtime CRUD/publication/migration is not implemented by this dataset correction.

## Teaching focus and difficulty — 2026-10-28

The v0.11 review catalog replaces instructionLevel with **two independent required text properties on each TEACHES relationship**:

| Property | Allowed values | Meaning |
|---|---|---|
| teachingFocus | PRIMARY / SUPPORTING / INCIDENTAL | Main instructional objective, supporting practice, or provided context only. |
| difficultyLevel | LOW / MEDIUM / HIGH | Difficulty of the tasks for that particular skill in the Module. |

PRIMARY identifies the objective the package is designed to teach directly. SUPPORTING has an explicit supporting exercise; it does not automatically replace a PRIMARY treatment. INCIDENTAL is exposure/context, with no instructional objective or mastery credit and must not be treated as closing a skill gap. Display labels may be Primary/Supporting/Incidental; JSON and graph use the uppercase enums above.

Both properties belong to the exact Module–Skill pair, not globally to a Module or MicroSkill. A Module may contain PRIMARY + HIGH for one skill, SUPPORTING + MEDIUM for another and INCIDENTAL + LOW for a third. Changing teachingFocus does not determine difficulty. Difficulty is not calculated from a numeric gap, requiredScore, legacy coverage, or a selected role title. No scoring/ranking engine is implemented by this catalog change.

The current review package has **994 nodes and 5,121 relationships**, including **246 LearningModules and 664 TEACHES pairs**. It retains all 85 existing modules and 181 teaching pairs, and adds **161 locally authored focused practice packages**, each with a primary objective, a supporting exercise and incidental context. Every one of the 79 skills now has a PRIMARY option at LOW, MEDIUM and HIGH. This is a review-dataset completeness criterion, not a universal graph cardinality rule requiring every future catalog to have three providers.

| Teaching focus | Pairs |
|---|---:|
| PRIMARY | 246 |
| SUPPORTING | 257 |
| INCIDENTAL | 161 |

Difficulty counts across all roles: LOW 372, MEDIUM 178, HIGH 114. For example, MOD-FOCUS-CORE01-HIGH teaches MS-CORE01 as PRIMARY/HIGH, MS-CORE02 as SUPPORTING/MEDIUM and MS-CORE03 as INCIDENTAL/LOW. MOD-READ-CORE01 remains a PRIMARY/LOW option for MS-CORE01, while MOD-FOCUS-CORE01-MEDIUM provides PRIMARY/MEDIUM.

All 85 original module IDs and original duration/price estimates are retained. Exactly one leading skill is PRIMARY; remaining practice is SUPPORTING. Nine formerly co-primary packages now have clearer titles, revised content references and version 1.3, with narrowed supporting tasks rather than unchanged co-primary work. Original content files are preserved for historical pins. Existing task modes (guided, independent, complex review) inform the authoring choices, not learner scores. These decisions remain NEEDS_EXPERT_REVIEW.

The 161 new packages include distinct guided/independent/complex tasks, supporting work, contextual material, evidence checks and assessment boundaries. They are **lesson/lab scaffolds pending expert authoring, sandbox assets and approval**, not complete production courses or official O*NET/ESCO mappings. The supplied contextual skill is not a newly asserted prerequisite. Prices/durations are review estimates, not vendor quotes or measured learning gains.

Six node labels, seven relationship types and store ownership remain unchanged. Keep existing skill prerequisites; module completion does not establish mastery. A selected Module is counted once for duration/price even when it addresses several gaps. The original instructionLevel/coverage representations and v0.9 runtime seed remain historical; no current runtime graph, API or learner history is migrated.

## Independent role-Level requirements

Each TargetRole owns distinct Level nodes. Each Level has its own REQUIRES_SKILL set and requiredScore values; sets may overlap or differ and are not constrained to be nested. Module selection occurs through missing skills; no direct Level–Module edge is added.

Application Developer currently has 11 required skills at Junior, 14 at Middle and 14 at Senior. MS-CORE01 thresholds are 0.60 / 0.75 / 0.90. MS-FS08, MS-FS15 and MS-FS16 occur at Middle/Senior but not Junior in this role. Those requirements and all non-teaching relationships are preserved. A Senior target does not make every recommended module HIGH; readiness and compatible evidence still govern suitability.

[Current dataset, authoring limits and manual procedures](../../dataset/TEACHING_FOCUS_DIFFICULTY.md).
