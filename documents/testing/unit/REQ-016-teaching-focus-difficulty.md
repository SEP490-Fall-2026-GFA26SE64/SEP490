# REQ-013-F01/F03 and REQ-016-F01/F02 — teaching focus/difficulty (unit)

Date: 2026-10-28. Scope: v0.11 review catalog and isolated import tooling.

Executed: **31 local regression tests passed** and importer dry-run passed (994 nodes/5121 edges). Validates both enums and independent pairs, exact manifests, all architectural fields, primary provider checks, orphan/duplicate/cycle handling, 161 content tables/tasks and retained non-teaching relationships and original duration/price, with nine documented content revisions. Application Developer role-Level assertion: 11/14/14 skills, CORE01 0.60/0.75/0.90. Workbook/diagram checks are artifact validation, not runtime acceptance.

Added 161 local scaffold packages; 246 total Modules/664 TEACHES pairs, 246 PRIMARY/257 SUPPORTING/161 INCIDENTAL. Every catalog skill has a PRIMARY option at all three difficulties. This is draft authoring coverage, not approved content or proven learning gain. No gap-to-difficulty or score-to-price rule is introduced.

[Exact source/authoring rules, structured manual checks and runtime limits](../../dataset/TEACHING_FOCUS_DIFFICULTY.md).


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
