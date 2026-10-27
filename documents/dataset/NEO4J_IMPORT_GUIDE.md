# Import ontology 0.10.0 into Neo4j

The current seed has **833 nodes and 4,638 relationships**. It contains occupation RIASEC, Level-owned competencies, 85 Modules, 79 Skills, 181 many-to-many TEACHES mappings and HAS_SKILL_PREREQUISITE. Earlier snapshots are incompatible; use an empty isolated graph rather than overlaying releases.

## 1. Validate the local package

From the repository root:

```bash
python3 documents/dataset/import/import_neo4j.py --dry-run
```

Regression checks (no database connection):

```bash
python3 documents/dataset/import/test_dataset.py
```

Expected: `Local checks passed: 833 nodes, 4638 relationships, 30 source RIASEC ratings.`

The validator checks source title membership, parent ownership, competency memberships, Level requirements, threshold bounds, module content, the skill prerequisite DAG, many-to-many teaching coverage and duplicate-pair checks and all 30 normalized RIASEC source values. The seed, scripts and lesson content are in `import/`; official source files and local evidence are in the sibling `sources/`. Full source/teaching approval remains a human review responsibility; a structural PASS does not constitute expert approval.

## 2. Create a separate review instance

In zsh:

```bash
read -s 'ONTOLOGY_NEO4J_PASSWORD?Password for ontology review: '
export ONTOLOGY_NEO4J_PASSWORD
docker run -d --name ontology-v010-neo4j \
  -p 127.0.0.1:7479:7474 \
  -p 127.0.0.1:7692:7687 \
  -e NEO4J_AUTH="neo4j/${ONTOLOGY_NEO4J_PASSWORD}" \
  -v ontology_v010_neo4j_data:/data \
  neo4j:5.26-community
```

Use an eight-character-or-longer password. In bash use `read -s -p 'Password: ' ONTOLOGY_NEO4J_PASSWORD`. If ports/container names are taken, choose free ones. Existing Browser/database on port 7475 is unaffected by these instructions.

Open [Neo4j Browser](http://localhost:7479/browser/), connect to `bolt://localhost:7692`, user `neo4j`. Existing instance: `docker start ontology-v010-neo4j`.

## 3. Import the JSON seed

```bash
python3 -m venv /tmp/ontology-v010-import-venv
/tmp/ontology-v010-import-venv/bin/python -m pip install 'neo4j>=5.26,<6'
export ONTOLOGY_NEO4J_URI='bolt://localhost:7692'
/tmp/ontology-v010-import-venv/bin/python documents/dataset/import/import_neo4j.py
unset ONTOLOGY_NEO4J_PASSWORD
```

If running from this dataset folder, use `python3 import/import_neo4j.py --dry-run`; the seed defaults to `import/ontology_seed-v010.json`. To specify it explicitly use `--file import/ontology_seed-v010.json`. Keep the sibling `sources/` folder and `import/content/` together with the scripts.

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

Browser can limit displayed records/visual graph size. Use scoped queries for readability; the all-graph view contains 833 nodes and 4,638 relationships.

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

[ontology_dataset.xlsx](ontology_dataset.xlsx) is the review workbook. [import/ontology_seed-v010.json](import/ontology_seed-v010.json) is the executable import seed. Both files have been regenerated for 0.10.0 and checked for record equality. The importer reads JSON; it does not read Excel or automatically apply human review inputs. If you edit workbook records, regenerate the seed and rerun validation before importing. Assessment policies/rubrics/readiness tasks remain outside the seed and Neo4j; learner results are stored separately.

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
- Expected: 85 Modules, 79 Skills and 181 TEACHES pairs; 833 total nodes and 4,638 relationships; no orphan rows. Some Modules teach multiple skills and some skills have multiple providers. Course and retired assessment/profile fields are absent.

Current automated evidence: local validation/dry-run and 25 regression tests pass; workbook entity/relationship rows are checked against JSON. These results do not certify the legacy application, content suitability, expert approval or a running database migration. This run covers data/validation only; runtime Testcontainers/Compose suites were not rerun, and legacy API compatibility remains unverified.

## Baseline compatibility

The local Compose baseline seed uses the [v09 envelope](question-bank/15-1212.00/ONTOLOGY_V09.md). Original v08 source/envelope/calibration pins are archived rather than repinned; all135 question item identities/content remain unchanged. Existing populated v08 databases require an explicit reviewed cutover, not an automatic overwrite or volume reset. [Executed REQ-016 checks and manual procedures](../testing/system/REQ-016-many-to-many-teaching.md).

## Inspect instructionLevel (text)

```cypher
MATCH (m:LearningModule)-[t:TEACHES]->(s:MicroSkill {id:'MS-DE06'})
RETURN m.id, m.title, s.id, s.name, t.instructionLevel,
       m.duration, m.price
ORDER BY m.id;
```

Expected: MOD-DE-J-MODEL-01 has FOUNDATIONAL; MOD-DE-J-QUAL-01 has INTERMEDIATE. The same skill retains independent values across providers. All 181 TEACHES records contain only one of the three exact text values (14/80/87 by FOUNDATIONAL/INTERMEDIATE/ADVANCED). No numeric coverage property remains in the v0.10 review graph payload.

Workbook: inspect TEACHES column J and the Instruction Levels comparison sheet. Local importer rejects numbers, numeric strings, unknown enum values and missing instructionLevel. [Conversion rules and manual checklist](INSTRUCTION_LEVELS.md). Existing runtime graph is not modified by editing the dataset.
