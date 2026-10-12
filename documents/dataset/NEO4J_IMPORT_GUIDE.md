# Import ontology 0.3.1 into Neo4j

This guide imports [ontology_v031_en.json](ontology_v031_en.json) into a dedicated Neo4j database for dataset review and graph exploration. It preserves the six ontology node types, seven relationship types and all review statuses. It does not implement the platform's assessment engine.

## 1. Choose the correct input and database

Use the current JSON seed, not the workbook or files in `archive/`. Excel is the review view; JSON is the import input. If you edit Excel, reconcile those changes into JSON before importing; editing Excel does not update JSON automatically.

The repository's current backend catalog and `documents/neo4j_schema.md` describe an older model using JobDomain and MacroCompetency. The current dataset instead uses Level, Competency and Course. **Importing this dataset does not make it compatible with the existing backend adapters.** Use a separate Neo4j instance for this guide. Connecting it to the application requires a separate schema, migration and adapter update.

| JSON section | Neo4j destination | Expected count |
|---|---|---:|
| TargetRoles | `:TargetRole` | 4 |
| Levels | `:Level` | 12 |
| Competencies | `:Competency` | 36 |
| MicroSkills | `:MicroSkill` | 64 |
| Courses | `:Course` | 36 |
| LearningModules | `:LearningModule` | 72 |
| relationships | Relationships with the types listed below | 578 |
| rubricDefinitions | Assessment configuration, outside the ontology graph | 4 criteria |

| Relationship | Direction | Count |
|---|---|---:|
| HAS_LEVEL | TargetRole → Level | 12 |
| REQUIRES_COMPETENCY | Level → Competency | 36 |
| REQUIRES_SKILL | Competency → MicroSkill | 201 |
| HAS_COURSE | Competency → Course | 36 |
| HAS_MODULE | Course → LearningModule | 72 |
| TEACHES | LearningModule → MicroSkill | 201 |
| HAS_PREREQUISITE | MicroSkill → prerequisite MicroSkill | 20 |

The arrow `A -[:HAS_PREREQUISITE]-> B` means learn foundation B before A.

## 2. Start an isolated Neo4j instance

The project uses Neo4j 5.26 Community. The example below uses the same version with a separate container, volume and ports. Run these commands from the repository root. Docker must be running. Choose a local password when prompted; it is not stored in this document.

```bash
read -s 'ONTOLOGY_NEO4J_PASSWORD?Password for the isolated Neo4j: '
export ONTOLOGY_NEO4J_PASSWORD

docker run -d --name ontology-v031-neo4j \
  -p 127.0.0.1:7475:7474 \
  -p 127.0.0.1:7688:7687 \
  -e NEO4J_AUTH="neo4j/${ONTOLOGY_NEO4J_PASSWORD}" \
  -v ontology_v031_neo4j_data:/data \
  neo4j:5.26-community
```

The password prompt above is for the project's zsh shell. In bash, use `read -s -p 'Password for the isolated Neo4j: ' ONTOLOGY_NEO4J_PASSWORD` instead.

Open [Neo4j Browser](http://localhost:7475), connect to `bolt://localhost:7688`, and log in as `neo4j` with the chosen password. Wait until login succeeds before importing. After the container has been created, restart it with `docker start ontology-v031-neo4j`; do not repeat `docker run` with the same name. If ports 7475/7688 are occupied, choose free ports and update the Browser URL and import URI together.

This instance is separate from `compose.dev.yml`. This guide does not stop, clear or import into the application's existing Neo4j.

## 3. Prepare Python

Use Python 3.10 or later and the official Neo4j Python driver. This example pins the driver's major version to 5 for the Neo4j 5.26 instance. Installation follows the [official driver instructions](https://neo4j.com/docs/python-manual/current/install/).

```bash
python3 -m venv /tmp/ontology-v031-import-venv
/tmp/ontology-v031-import-venv/bin/python -m pip install 'neo4j>=5.26,<6'
```

No APOC, CSV conversion or Neo4j import-directory mount is required. Python reads JSON on the client and sends property maps as parameters.

## 4. Save the import example

Copy the complete Python block below into `/tmp/import_ontology_v031.py`. It is an executable example embedded in this guide, not an existing repository importer.

The example is intentionally limited to the supplied 0.3.1 release. It validates expected counts, endpoint types, parent links, property types, score bounds, mandatory flags, module sequence and prerequisite acyclicity. A live import accepts an empty graph or an exact repeat of the same graph. It rejects a different existing graph and never updates approval decisions silently. Stop other writers while importing; this example is for a dedicated review instance, not concurrent production ingestion.

```python
import argparse
import getpass
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

LABELS = {
    "TargetRoles": ("TargetRole", 4), "Levels": ("Level", 12),
    "Competencies": ("Competency", 36), "MicroSkills": ("MicroSkill", 64),
    "Courses": ("Course", 36), "LearningModules": ("LearningModule", 72),
}
TYPES = {
    "HAS_LEVEL": ("TargetRole", "Level", 12),
    "REQUIRES_COMPETENCY": ("Level", "Competency", 36),
    "REQUIRES_SKILL": ("Competency", "MicroSkill", 201),
    "HAS_COURSE": ("Competency", "Course", 36),
    "HAS_MODULE": ("Course", "LearningModule", 72),
    "TEACHES": ("LearningModule", "MicroSkill", 201),
    "HAS_PREREQUISITE": ("MicroSkill", "MicroSkill", 20),
}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def properties(row, omit=()):
    result = {k: v for k, v in row.items() if k not in omit and v is not None}
    require(all(isinstance(v, (str, bool, int, float)) for v in result.values()),
            "Only scalar properties are supported by this example")
    return result

parser = argparse.ArgumentParser()
parser.add_argument("--file", required=True, type=Path)
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args()
data = json.loads(args.file.read_text(encoding="utf-8"))
nodes, edges, batches = {}, {}, defaultdict(list)
for section, (label, count) in LABELS.items():
    require(len(data[section]) == count, f"Unexpected count: {section}")
    for row in data[section]:
        require(row["id"] not in nodes, "Duplicate node ID")
        omit = ("targetRoleId",) if label == "Level" else ("levelId",) if label == "Competency" else ()
        nodes[row["id"]] = ([label], properties(row, omit))
        batches[label].append(nodes[row["id"]][1])
        if label == "LearningModule":
            require((args.file.parent / row["contentUri"]).is_file(), "Missing module content")

counts = Counter()
prereqs = defaultdict(list)
pairs, sequences, parents = set(), defaultdict(list), defaultdict(list)
for row in data["relationships"]:
    kind = row["type"]
    require(kind in TYPES, f"Unsupported relationship: {kind}")
    start, end, _ = TYPES[kind]
    require(row["fromId"] in nodes and row["toId"] in nodes, "Missing endpoint")
    require(nodes[row["fromId"]][0] == [start] and nodes[row["toId"]][0] == [end], "Wrong endpoint labels")
    require(row["id"] not in edges, "Duplicate relationship ID")
    pair = (kind, row["fromId"], row["toId"])
    require(pair not in pairs, "Duplicate relationship endpoints")
    pairs.add(pair)
    edges[row["id"]] = (kind, row["fromId"], row["toId"], properties(row, ("type", "fromId", "toId")))
    counts[kind] += 1
    if kind == "REQUIRES_SKILL":
        require(type(row["requiredScore"]) in (int, float) and 0 <= row["requiredScore"] <= 1, "Invalid score")
        require(type(row["isMandatory"]) is bool, "Invalid mandatory flag")
        require((row["rubricId"], row["rubricVersion"]) == ("RUB-SKILL-01", "1.1"), "Unexpected rubric")
    if kind in ("HAS_LEVEL", "REQUIRES_COMPETENCY"):
        parents[(kind, row["toId"])].append(row["fromId"])
    if kind == "HAS_MODULE":
        require(type(row["sequence"]) is int and row["sequence"] > 0, "Invalid sequence")
        sequences[row["fromId"]].append(row["sequence"])
    if kind == "HAS_PREREQUISITE":
        require(row["fromId"] != row["toId"], "Self prerequisite")
        prereqs[row["fromId"]].append(row["toId"])
require(counts == Counter({k: v[2] for k, v in TYPES.items()}), "Unexpected relationship counts")
for row in data["Levels"]:
    require(parents[("HAS_LEVEL", row["id"])] == [row["targetRoleId"]], "Level parent mismatch")
for row in data["Competencies"]:
    require(parents[("REQUIRES_COMPETENCY", row["id"])] == [row["levelId"]], "Competency parent mismatch")
for row in data["Courses"]:
    require(sorted(sequences[row["id"]]) == [1, 2], "Expected two ordered modules per course")
visited, active = set(), set()
def visit(node):
    require(node not in active, "Prerequisite cycle")
    if node in visited:
        return
    active.add(node)
    for foundation in prereqs[node]:
        visit(foundation)
    active.remove(node)
    visited.add(node)
for node in list(prereqs):
    visit(node)
rubrics = data["rubricDefinitions"]
require(len(rubrics) == 4, "Expected four rubric criteria")
require({r["criterionId"] for r in rubrics} == {"CORRECTNESS", "VERIFICATION", "AUTONOMY", "REASONING"}, "Invalid criteria")
require(all((r["rubricId"], r["rubricVersion"]) == ("RUB-SKILL-01", "1.1") for r in rubrics), "Invalid rubric version")
require(all(type(r["weight"]) in (int, float) and r["weight"] > 0 for r in rubrics), "Invalid rubric weight")
require(abs(sum(r["weight"] for r in rubrics) - 1) < 1e-9, "Weights must sum to one")
print("Local checks passed: 224 nodes, 578 relationships, 4 rubric criteria.")
if args.dry_run:
    raise SystemExit(0)

from neo4j import GraphDatabase
uri = os.environ.get("ONTOLOGY_NEO4J_URI", "bolt://localhost:7688")
user = os.environ.get("ONTOLOGY_NEO4J_USER", "neo4j")
password = os.environ.get("ONTOLOGY_NEO4J_PASSWORD") or getpass.getpass("Neo4j password: ")
database = os.environ.get("ONTOLOGY_NEO4J_DATABASE", "neo4j")

def snapshot(tx):
    actual_nodes, actual_edges = {}, {}
    for r in tx.run("MATCH (n) RETURN labels(n) AS labels, properties(n) AS props"):
        require(r["props"].get("id") not in actual_nodes, "Existing duplicate/missing node ID")
        actual_nodes[r["props"].get("id")] = (sorted(r["labels"]), dict(r["props"]))
    for r in tx.run("MATCH (a)-[r]->(b) RETURN type(r) AS kind, a.id AS src, b.id AS dst, properties(r) AS props"):
        require(r["props"].get("id") not in actual_edges, "Existing duplicate/missing edge ID")
        actual_edges[r["props"].get("id")] = (r["kind"], r["src"], r["dst"], dict(r["props"]))
    return actual_nodes, actual_edges

def preflight(tx):
    old_nodes, old_edges = snapshot(tx)
    require((not old_nodes and not old_edges) or (old_nodes == nodes and old_edges == edges),
            "Database is neither empty nor an exact copy of this release; import refused")

def import_graph(tx):
    preflight(tx)
    if tx.run("MATCH (n) RETURN count(n) AS total").single()["total"]:
        return "Exact release already present; no changes made."
    for label, rows in batches.items():
        # Labels/types come exclusively from the fixed allowlists above.
        tx.run(f"UNWIND $rows AS row CREATE (n:{label}) SET n = row", rows=rows).consume()
    for kind, (start, end, _) in TYPES.items():
        rows = [{"fromId": a, "toId": b, "props": p} for t, a, b, p in edges.values() if t == kind]
        query = (f"UNWIND $rows AS row MATCH (a:{start} {{id: row.fromId}}) "
                 f"MATCH (b:{end} {{id: row.toId}}) CREATE (a)-[r:{kind}]->(b) SET r = row.props")
        tx.run(query, rows=rows).consume()
    require(snapshot(tx) == (nodes, edges), "Graph differs from input; transaction rolled back")
    return "Imported and verified: 224 nodes and 578 relationships."

with GraphDatabase.driver(uri, auth=(user, password)) as driver:
    driver.verify_connectivity()
    with driver.session(database=database) as session:
        session.execute_read(preflight)
        # Schema statements commit separately from the data transaction.
        for label, _ in LABELS.values():
            session.run(f"CREATE CONSTRAINT ontology_v031_{label.lower()}_id IF NOT EXISTS "
                        f"FOR (n:{label}) REQUIRE n.id IS UNIQUE").consume()
        print(session.execute_write(import_graph))
```

Six uniqueness constraints protect node IDs within their labels. Relationship IDs and endpoint pairs are checked by the example; it does not establish a database-wide relationship uniqueness constraint. The nodes and edges are written and verified in one managed transaction. An exception rolls back the data transaction; already-created constraints remain. This follows Neo4j's [transaction model](https://neo4j.com/docs/python-manual/current/transactions/).

This example keeps `reviewedAt` as its supplied representation (currently null). If future approved data uses ISO timestamps, this example stores them as strings; a production importer should explicitly normalize timestamps to the application's chosen Neo4j temporal type.

## 5. Validate, then import

Run from the repository root. Dry-run reads the local files only; it neither connects to Neo4j nor installs the driver.

```bash
python3 /tmp/import_ontology_v031.py \
  --file documents/dataset/ontology_v031_en.json --dry-run
```

Then import into the isolated instance:

```bash
export ONTOLOGY_NEO4J_URI='bolt://localhost:7688'
export ONTOLOGY_NEO4J_USER='neo4j'
export ONTOLOGY_NEO4J_DATABASE='neo4j'

/tmp/ontology-v031-import-venv/bin/python /tmp/import_ontology_v031.py \
  --file documents/dataset/ontology_v031_en.json
```

If the password environment variable is not set, the importer prompts without displaying it. Do not put a password in the command or JSON seed. Once finished, remove it from the shell with `unset ONTOLOGY_NEO4J_PASSWORD`.

For a downloaded handoff ZIP, extract it, change into `ontology_v031_handoff/`, and use `--file ontology_v031_en.json` instead. Keep `content/` beside the JSON so that content references resolve.

## 6. Check the graph in Neo4j Browser

Run each query separately. Expected results apply to the dedicated review database.

```cypher
MATCH (n)
RETURN labels(n)[0] AS entity, count(n) AS records
ORDER BY entity;
```

```cypher
MATCH ()-[r]->()
RETURN type(r) AS relationship, count(r) AS records
ORDER BY relationship;
```

Explore one role, level and its required skills:

```cypher
MATCH p = (role:TargetRole {id: 'ROLE-DE'})-[:HAS_LEVEL]->
          (level:Level {id: 'LV-DE-J'})-[:REQUIRES_COMPETENCY]->
          (:Competency)-[:REQUIRES_SKILL]->(:MicroSkill)
RETURN p;
```

Inspect level-specific scores:

```cypher
MATCH (role:TargetRole)-[:HAS_LEVEL]->(level:Level)
      -[:REQUIRES_COMPETENCY]->(c:Competency)
      -[r:REQUIRES_SKILL]->(s:MicroSkill)
RETURN role.name AS role, level.name AS level, c.name AS competency,
       s.id AS skillId, s.name AS skill, r.requiredScore AS threshold,
       r.isMandatory AS mandatory
ORDER BY role, level, skillId;
```

Confirm prerequisites and publication status:

```cypher
MATCH (skill:MicroSkill)-[:HAS_PREREQUISITE]->(foundation:MicroSkill)
RETURN skill.name AS learningTarget, foundation.name AS learnFirst;
```

```cypher
MATCH (n)
WHERE n.status = 'ACTIVE' AND n.reviewStatus = 'APPROVED'
  AND n.reviewedBy IS NOT NULL AND trim(n.reviewedBy) <> ''
  AND n.reviewedAt IS NOT NULL
RETURN count(n) AS approvalCandidates;
```

The last query returns **0** for this release. It is a quick record check, not the full publication gate: timestamps must be valid, and all required dependencies and rubric configuration must be approved before an official assessment. See [field and assessment rules](ontology_fields_review.md).

## 7. What stays outside Neo4j

| Item | Handling |
|---|---|
| `rubricDefinitions` | Keep in versioned assessment configuration; resolve `rubricId` + `rubricVersion` from REQUIRES_SKILL. No Rubric graph node is created. |
| Module Markdown and shared topic lessons | Deploy `content/` to application storage separately. Neo4j holds the relative `contentUri`, not the lesson body. |
| `sourceConceptUri`, `sourceLocator`, `sourceVerification` | Remain in the specification and source evidence, not graph properties. |
| Learner scores, assessment evidence and accounts | Not part of this seed or import. |
| Organization identity | Deployment context for this single-organization seed. No Organization node or invented tenant ID is added. |

The flat-export `Level.targetRoleId` and `Competency.levelId` are validated against relationships, then omitted as redundant Neo4j properties. Likewise relationship `type`, `fromId` and `toId` become the actual graph type and endpoints. IDs, thresholds, sequence, readiness outcome and review metadata remain graph properties. JSON nulls are omitted because Neo4j does not store null property values; a missing approval property still means unapproved.

All review statuses are preserved. Importing successfully does not approve skills, courses, prerequisites or thresholds. Course completion does not establish level attainment.

## 8. Troubleshooting and implementation limits

| Issue | Action |
|---|---|
| Connection refused | Check that the isolated container is running, login works and the Bolt port matches the URI. |
| Authentication failed | Use the password chosen when the volume was first initialized. Changing the variable does not reset an existing database password. |
| Database is neither empty nor an exact copy | Check the URI/database selection. Use a fresh isolated instance to review changed data; the example intentionally does not overwrite existing records. |
| Missing module content | Extract or copy the complete `content/` directory beside the seed. |
| Unexpected count or schema field | This example targets 0.3.1. Review a new release and adjust validation deliberately. |
| Import succeeds but the application cannot read it | Update the backend's old schema, repositories, adapters and publication checks for the new ontology. |

The embedded example has been syntax-checked and its local validation run against the supplied seed. A live Neo4j import has not been executed as part of preparing this document. The stored release validation also covers assessment-skill teaching coverage and module ordering; the example's local checks do not replace expert review or every full-release validation.

## Official technical references

- [Neo4j Python driver installation](https://neo4j.com/docs/python-manual/current/install/)
- [Managed transactions, parameters and rollback](https://neo4j.com/docs/python-manual/current/transactions/)
- [Cypher uniqueness constraints](https://neo4j.com/docs/cypher-manual/current/constraints/managing-constraints/)
- [LOAD CSV](https://neo4j.com/docs/cypher-manual/5/clauses/load-csv/) explains the separate CSV import route. This guide uses JSON through the driver.
