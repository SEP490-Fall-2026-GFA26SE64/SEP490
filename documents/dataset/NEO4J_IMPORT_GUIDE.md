# Import ontology 0.11.0 into Neo4j

The current seed has **994 nodes and 5,121 relationships**. It contains occupation RIASEC, Level-owned competencies, 246 Modules, 79 Skills, 664 many-to-many TEACHES mappings and HAS_SKILL_PREREQUISITE. Earlier snapshots are incompatible; use an empty isolated graph rather than overlaying releases.

## 1. Validate the local package

From the repository root:

```bash
python3 documents/dataset/import/import_neo4j.py --dry-run
```

Regression checks (no database connection):

```bash
python3 documents/dataset/import/test_dataset.py
```

Expected: `Local checks passed: 994 nodes, 5121 relationships, 30 source RIASEC ratings.`

The validator checks source title membership, parent ownership, competency memberships, Level requirements, threshold bounds, module content, the skill prerequisite DAG, many-to-many teaching coverage and duplicate-pair checks and all 30 normalized RIASEC source values. The seed, scripts and lesson content are in `import/`; official source files and local evidence are in the sibling `sources/`. Full source/teaching approval remains a human review responsibility; a structural PASS does not constitute expert approval.

## 2. Create a separate review instance

In zsh:

```bash
read -s 'ONTOLOGY_NEO4J_PASSWORD?Password for ontology review: '
export ONTOLOGY_NEO4J_PASSWORD
docker run -d --name ontology-v011-neo4j \
  -p 127.0.0.1:7479:7474 \
  -p 127.0.0.1:7692:7687 \
  -e NEO4J_AUTH="neo4j/${ONTOLOGY_NEO4J_PASSWORD}" \
  -v ontology_v011_neo4j_data:/data \
  neo4j:5.26-community
```

Use an eight-character-or-longer password. In bash use `read -s -p 'Password: ' ONTOLOGY_NEO4J_PASSWORD`. If ports/container names are taken, choose free ones. Existing Browser/database on port 7475 is unaffected by these instructions.

Open [Neo4j Browser](http://localhost:7479/browser/), connect to `bolt://localhost:7692`, user `neo4j`. Existing instance: `docker start ontology-v011-neo4j`.

## 3. Import the JSON seed

```bash
python3 -m venv /tmp/ontology-v011-import-venv
/tmp/ontology-v011-import-venv/bin/python -m pip install 'neo4j>=5.26,<6'
export ONTOLOGY_NEO4J_URI='bolt://localhost:7692'
/tmp/ontology-v011-import-venv/bin/python documents/dataset/import/import_neo4j.py
unset ONTOLOGY_NEO4J_PASSWORD
```

If running from this dataset folder, use `python3 import/import_neo4j.py --dry-run`; the seed defaults to `import/ontology_seed-v011.json`. To specify it explicitly use `--file import/ontology_seed-v011.json`. Keep the sibling `sources/` folder and `import/content/` together with the scripts.

The importer supports an empty graph or an exact repeat of this snapshot. It refuses any different graph, including one with changed reviewer decisions. It creates six node-ID uniqueness constraints and imports all records in one managed data transaction; DDL commits separately. Stop other writers during review import. No deletion, overwrite migration, concurrent production ingestion or backend adapter migration is performed.

Parent convenience fields (occupationId, targetRoleId and competency levelId) become graph edges and are omitted from node properties. The six interest fields remain on Occupation as Float [0,1]. Rubric configuration, learner results, source evidence and lesson bodies remain outside the graph. All definitions await expert review.

## 4. Inspect the result

Run each query separately:

```cypher
MATCH (n) RETURN labels(n)[0] AS entity, count(n) AS records ORDER BY entity;
```

```cypher
MATCH ()-[r]->() RETURN type(r) AS relationship, count(r) AS records ORDER BY relationship;
```

```cypher
MATCH (o:Occupation)
RETURN o.code, o.name, o.interestRealistic AS R, o.interestInvestigative AS I,
       o.interestArtistic AS A, o.interestSocial AS S,
       o.interestEnterprising AS E, o.interestConventional AS C;
```

```cypher
MATCH p = (:Occupation {code:'15-1252.00'})-[:HAS_ROLE]->(:TargetRole)
          -[:HAS_LEVEL]->(:Level)-[:HAS_COMPETENCY]->(:Competency)
RETURN p;
```

```cypher
MATCH (:TargetRole {name:'Software Developer'})-[:HAS_LEVEL]->(l:Level)
      -[r:REQUIRES_SKILL]->(s:MicroSkill)
RETURN l.name, s.name, r.requiredScore ORDER BY l.rank, s.name;
```

```cypher
MATCH p = (:Level {id:'LV-DE-J'})-[:REQUIRES_SKILL]->(:MicroSkill)
          <-[:TEACHES]-(:LearningModule)
RETURN p;
```

```cypher
MATCH (s:MicroSkill)
OPTIONAL MATCH (m:LearningModule)-[t:TEACHES]->(s)
WITH s, count(t) AS providers WHERE providers = 0
RETURN s.id, providers;
```

```cypher
MATCH (m:LearningModule)
OPTIONAL MATCH (m)-[t:TEACHES]->(:MicroSkill)
WITH m, count(t) AS skills WHERE skills = 0
RETURN m.id, skills;
```

Both orphan-detection queries must return no rows.

```cypher
MATCH p = (:MicroSkill)-[:HAS_SKILL_PREREQUISITE]->(:MicroSkill) RETURN p;
```

To view the entire graph:

```cypher
MATCH (a)-[r]->(b) RETURN a,r,b;
```

Browser can limit displayed records/visual graph size. Use scoped queries for readability; the all-graph view contains 994 nodes and 5,121 relationships.

[Field rules](ONTOLOGY.md) and [source/scale specification](ONTOLOGY.md) accompany the seed. Newly added reading/practice scaffolds are sample content pending detailed lesson/lab authoring and review; teaching-edge coverage alone does not prove content is suitable for official assessment.

## Current import boundary

Graph payload generation is in import/graph_payload.py. The validator compares all three export-only join fields to the supplied relationship records before creating the graph payload, and dry-run also validates property serialization. Export-only join fields are not stored. The six occupation interest fields remain actual graph properties. TargetRole has no profile-grouping property.

The current seed has no assessment configuration sections. Earlier rubric/task proposals are preserved only in sources/ontology_v07_history/assessment_reference.json. The assessment service must define an explicit external mapping; Neo4j contains no rubric or readiness-assessment references.

```cypher
MATCH (r:TargetRole)
RETURN r.id, r.name, r.scope
ORDER BY r.name, r.id;
```

```cypher
MATCH (n)
WHERE n.occupationId IS NOT NULL OR n.targetRoleId IS NOT NULL
   OR n.levelId IS NOT NULL OR n.levelIds IS NOT NULL
RETURN count(n) AS unexpectedExportOnlyProperties;
```

The last query must return 0.

## Excel and seed synchronization

[ontology_dataset.xlsx](ontology_dataset.xlsx) is the review workbook. [import/ontology_seed-v011.json](import/ontology_seed-v011.json) is the executable import seed. Both files have been regenerated for 0.11.0 and checked for record equality. The importer reads JSON; it does not read Excel or automatically apply human review inputs. If you edit workbook records, regenerate the seed and rerun validation before importing. Assessment policies/rubrics/readiness tasks remain outside the seed and Neo4j; learner results are stored separately.

## Inspect many-to-many candidates

The following query inspects candidate coverage only; it does not approve content or compute a final pathway. Set `levelId` and `gapSkillIds` from the learner's selected Level and confirmed gaps.

```cypher
MATCH (:Level {id: $levelId})-[:REQUIRES_SKILL]->(s:MicroSkill)
      <-[:TEACHES]-(m:LearningModule)
WHERE s.id IN $gapSkillIds
RETURN m.id AS moduleId, m.title AS title, m.contentUri AS contentUri,
       collect(DISTINCT s.id) AS matchedGapSkillIds
ORDER BY moduleId;
```

The grouped result includes a Module once with all matched gaps. Multiple rows for the same skill indicate candidate providers, not a requirement to learn them all. Official selection also checks review/publication, content depth, skill readiness and feasible activity order. Module completion never creates PASS results for every TEACHES target.

## Manual verification checklist

- URL: http://localhost:7479/browser/ for an isolated review database; workbook: ontology_dataset.xlsx.
- Prerequisites: validate the package and import this exact snapshot into an empty graph using the guide above. Existing databases are not modified by these instructions.
- Steps: inspect LearningModules and TEACHES sheets, run entity/relationship counts and both orphan queries, then run the candidate query with an actual Level and confirmed gap IDs.
- Expected: 246 Modules, 79 Skills and 664 TEACHES pairs; 994 total nodes and 5,121 relationships; no orphan rows. Some Modules teach multiple skills and some skills have multiple providers. Course and retired assessment/profile fields are absent.

Current automated evidence: local validation/dry-run and 31 regression tests pass; workbook entity/relationship rows are checked against JSON. These results do not certify the legacy application, content suitability, expert approval or a running database migration. This run covers data/validation only; runtime Testcontainers/Compose suites were not rerun, and legacy API compatibility remains unverified.

## Baseline compatibility

The local Compose baseline seed uses the [v09 envelope](question-bank/15-1212.00/ONTOLOGY_V09.md). Original v08 source/envelope/calibration pins are archived rather than repinned; all135 question item identities/content remain unchanged. Existing populated v08 databases require an explicit reviewed cutover, not an automatic overwrite or volume reset. [Executed REQ-016 checks and manual procedures](../testing/system/REQ-016-many-to-many-teaching.md).

## Inspect teaching focus and difficulty

```cypher
MATCH (m:LearningModule)-[t:TEACHES]->(s:MicroSkill {id:'MS-CORE01'})
RETURN m.id, m.title, t.teachingFocus, t.difficultyLevel, m.duration, m.price
ORDER BY t.teachingFocus, t.difficultyLevel, m.id;
```

Expected: MOD-READ-CORE01 is PRIMARY/LOW; MOD-FOCUS-CORE01-MEDIUM and MOD-FOCUS-CORE01-HIGH are PRIMARY/MEDIUM and PRIMARY/HIGH. No instructionLevel/coverage property remains on current graph payloads. A supplied incidental context cannot be used to close a gap.

```cypher
MATCH (m:LearningModule)-[t:TEACHES]->(:MicroSkill)
RETURN t.teachingFocus, t.difficultyLevel, count(*) AS pairs
ORDER BY t.teachingFocus, t.difficultyLevel;
```

Expected totals: 664 pairs, teachingFocus counts PRIMARY 246 / SUPPORTING 257 / INCIDENTAL 161. Current source is ontology_seed-v011.json. v0.10 review and v0.9 runtime seeds are retained, not overlaid or repinned. [Authoring, version boundaries and manual checks](TEACHING_FOCUS_DIFFICULTY.md). No runtime recommender upgrade is performed.


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
