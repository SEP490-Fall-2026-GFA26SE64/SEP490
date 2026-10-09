# RQ2 synthetic graph dataset V2

Regenerate from the repository root:

```bash
python3 documents/dataset/generate_rq2_graphs.py
```

Python standard library plus the project's XLSX parser; no database connection is used. Options: `--sizes 1000 5000 10000`, `--seed 42`, `--output-dir PATH`.

## Decisions captured

- Each graph preserves the current ontology workbook as its complete core, then adds synthetic nodes and relationships to reach the selected size. The workbook SHA-256 is included in graph metadata.
- Graphs are nested: every core/source and generated node/edge in 1,000 also occurs unchanged in 5,000; every item in 5,000 occurs unchanged in 10,000. Generated identifiers and per-entity generation choices are stable across sizes for a fixed seed.
- Each graph has exactly 1,000 measured traversals total: 334 at max 3 hops, 333 at max 4, and 333 at max 5. There are another 100 warm-ups per graph, split 34/33/33. These are distinct workload calls per dataset size.
- `3/4/5 hops` means one to that maximum number of incoming prerequisite edges. Results count distinct prerequisite nodes and exclude the starting skill.
- Candidate start skills are chosen from the 1,000-node graph's skill pool and the exact same start-code schedule is reused for every size. LOW/MEDIUM/HIGH strata are based on reachable-node ranks in the 1k graph and frozen for all sizes. Expected result counts are recalculated for each size. Warm-up and measured samples have seeded order and retain zero-result cases.

## Node allocation and observed results

| Label | 1,000 | 5,000 | 10,000 |
|---|---:|---:|---:|
| JobDomain | 3 | 3 | 3 |
| TargetRole | 100 | 500 | 1,000 |
| MacroCompetency | 30 | 150 | 300 |
| MicroSkill | 600 | 3,000 | 6,000 |
| LearningModule | 267 | 1,347 | 2,697 |
| **Total nodes** | **1,000** | **5,000** | **10,000** |
| **Total relationships** | **5,899** | **29,125** | **58,091** |

All seven ontology relationship types are present. Each MicroSkill belongs to one macro; each generated role requires 15–25 skills and its macro requirements are derived from those skills; each generated module teaches 3–6 skills and has 0–2 entry requirements. Existing ontology rows and mappings are retained exactly; synthetic degree rules apply to generated entities, because current curated role/module degrees vary by design.

Prerequisites contain exactly twice as many edges as MicroSkill nodes (including the ontology core), have mean outgoing degree 2 and maximum outgoing degree 4. New prerequisite links extend the source graph without creating cycles. Longest path is 7 hops. Edges are directed from prerequisite skill to dependent/advanced skill.

## Content, isolation and limits

The source ontology remains intact. Generated nodes use the `RQ2_` code prefix and synthetic content. Generated module URLs use `example.com` placeholders and are not real courses. The synthetic organization UUID is only used for generated roles; this dataset does not create a PostgreSQL organization. Learner profiles and RQ1 golden labels are unrelated and not included.

These JSON files have not been imported into Neo4j and contain no latency measurements. Use a dedicated RQ2 database. When importing, convert ISO timestamp strings to Neo4j datetimes and load one graph size into a clean database. Keep import time separate from query timings.

This is controlled synthetic scaling, not a claim about production data distributions. Fixed average degree and bounded traversal depth can make reachable neighborhoods similar across total graph sizes; report actual result counts, stratified latency, machine/Neo4j versions and cache policy. Mean/P95 are calculated later by the runner from the 1,000 calls per graph. `manifest.json` records observed graph counts, checks and checksums.

Each size folder contains `graph.json`, `workloads.json`, and `manifest.json`. Seed 42 generates the graph; workload sampling uses seed 1042 with separate streams per depth.
