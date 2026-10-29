> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# Module Outcomes

**Local REQ-013 integration — 2026-10-28:** The new Module editor/API saves complete many-to-many mapping snapshots, exactly one PRIMARY, per-pair teachingFocus/difficultyLevel and all six metadata fields. Duplicate pairs/invalid endpoints are rejected; retained pairs preserve their relationship ID, and released changes require a new reviewed Module revision. Catalog version is separate from revision history. Legacy graph mappings are not silently migrated. [Workflow scope](../Learning%20module%20management/README.md), [real-store evidence](../../testing/integration/REQ-013-module-management.md).

**Ontology 0.9.0 (approved 2026-10-26):** LearningModule–MicroSkill uses many-to-many TEACHES. Each Module teaches at least one skill; each catalog skill has at least one teaching Module; duplicate pairs are rejected. Course is removed. Learning objectives and assessment evidence may be authored in content/assessment documentation; expectedOutcome and rubric/readiness-assessment references are not graph properties; the v0.11 correction below adds teachingFocus and difficultyLevel to TEACHES. Both sides of the mapping must be checked when publishing or replacing a module. Earlier one-to-one mapping rules are superseded. Module completion does not prove mastery of every linked skill.


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


## Exactly one PRIMARY per Module — confirmed 2026-10-28

Every Module must have **exactly one** TEACHES relationship with teachingFocus=PRIMARY. Zero or two-or-more primary links are invalid, including replacements that leave a module without its primary skill. A MicroSkill may still be PRIMARY in many different Modules at the same or different difficulties. SUPPORTING and INCIDENTAL links remain optional; they do not count as additional primary objectives.

All 246 current Modules satisfy the rule; 664 teaching pairs remain populated (246 PRIMARY, 257 SUPPORTING, 161 INCIDENTAL). Every skill retains PRIMARY LOW/MEDIUM/HIGH choices. Nine alternative packages (DE01, FS03 and FS07 at each difficulty, IDs ending -ALT) provide same-primary/same-difficulty options with different supporting skills and verification tasks. These are locally authored scaffolds pending review, not vendor courses or validated learning gains.

The nine formerly co-primary MODEL/SERVICE/AUTO packages now have one main objective, smaller supporting work and content version 1.3 in new -single-primary.md files. Existing IDs, difficulty values, prerequisite/Level requirements and all original price/duration values are preserved. The revised titles/content pointers are audited in revisedExistingModules in the authoring manifest; historical original files and v0.10/v0.9 seeds remain unchanged.

The isolated import validator enforces the count and tests reject both zero and multiple PRIMARY links. Neo4j uniqueness constraints alone cannot enforce this relationship aggregate; future catalog write APIs must apply it transactionally. No runtime API/database upgrade is claimed.

Manual check: open Teaching Map or Module Checks in the workbook. Every module must have Primary count=1 and structural result OK. Compare MOD-DE-J-MODEL-01 with MOD-FOCUS-DE01-LOW-ALT: both teach MS-DE01 as PRIMARY/LOW, but use different supporting skills/tasks. Skill Options must retain nonzero counts for all three difficulties. On an optional isolated review graph at http://localhost:7479/browser/, run:

```cypher
MATCH (m:LearningModule)
OPTIONAL MATCH (m)-[t:TEACHES {teachingFocus:'PRIMARY'}]->(:MicroSkill)
WITH m, count(t) AS primaryCount
WHERE primaryCount <> 1
RETURN m.id, primaryCount;
```

Expected: no rows. This is a manual procedure; no live runtime database is changed.
