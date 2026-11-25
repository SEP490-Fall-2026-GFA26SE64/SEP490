# Experiment 2 Directed prerequisite query latency

Protocol version 0.2, updated 25 November 2026. **Status: corrected research design, diagnostic audit recorded, and standalone three-scale measurements (1,000 / 5,000 / 10,000 MicroSkill nodes) executed on Neo4j Community 5.26.33.**

## Registered question

> What is the query latency of deep pathfinding operations in Neo4j (e.g., 3-hop to 5-hop depth) as the number of nodes/edges in the competency ontology scales from 1,000 to 10,000?

Wording is retained from [Version 2, section 3.3](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md). Primary workload: directed shortest paths between MicroSkill nodes over `HAS_SKILL_PREREQUISITE`. A shortest prerequisite path is a structural query benchmark, not the production pathway planner or proof of semantic feasibility at every knowledge level. This experiment makes no Neo4j-versus-SQL or production-concurrency claim.

The previous draft's fixed 8.40/12.60/16.90 ms scale table and causal percentages were synthetic placeholders and must not be reused as measured findings.

## Actual diagnostic evidence

The [22 November audit](evidence/rq2/20261122-current-service-audit/RESULTS.md) invoked the existing service directly against local Neo4j 5.26.32 using Java 24.0.1. It is a diagnostic run on the old mixed-relation query, not execution of this corrected directed protocol. Database counts were 1,059 nodes and 4,795 relationships before and after.

| Selected scale | Actual graph nodes | Nodes reported by service | Response Mean ms | Response P95 ms |
|---|---:|---:|---:|---:|
| 1k | 1,059 | 1,098 | 12.88 | 21.01 |
| 5k | 1,059 | 5,000 | 26.64 | 60.26 |
| 10k | 1,059 | 10,000 | 30.05 | 64.26 |

Each response used 100 measured queries and 50 warm-ups on set 1. These response values include the existing artificial scale offsets and timing floor; **they are not valid scaling measurements**. The first 100 pairs in each of three sets yielded 225 no-path results, 14 paths below three hops and 61 valid 3–5-hop results out of 300. A no-path result does not identify whether an endpoint was absent or merely unreachable. These findings do not characterize an uninspected teammate dataset or every fixture entry.

The UI/API, Neo4j driver, timer and aggregate calculations exist. However, scale counts/table values are hardcoded, the old query accepts undirected mixed relations, missing paths are counted, phase breakdowns use fixed proportions, and exports retain only 30 timings and 10 sample paths. Existing browser tests do not validate measurement fidelity. The separate NFR-P02 test uses four catalog queries with three warm-ups and ten measured runs; it is not this RQ2 experiment.

## Dataset design

Generate real isolated synthetic graphs with total ontology node counts of **1,000, 5,000 and 10,000**. Count all declared ontology labels; report MicroSkill counts separately so the path-query search space is visible. Do not call a graph “10k” because it has a file or request label of that name. Relationship counts are generated and observed, not fixed to the historical 5,100/25,800/52,400 values.

Reuse the project's node/relationship schema. Retain ownership, stable IDs and meaningful prerequisite direction. Build acyclic prerequisite structures with sufficient depths, preserving comparable label proportions, average prerequisite degree and degree distribution across scale. Increase graph size without silently increasing density. Do not make the larger scale merely an identical queried component plus disconnected padding; query sources/targets must cover the generated graph. A separate density sensitivity study is optional and must not be mixed into the size effect.

**Proposed generation parameters, pending pilot freeze:** seeds 17/29/43 as three independent graph instances per scale; a layered prerequisite DAG with at least six layers; bounded outgoing prerequisite degree. Final label proportions, layer widths, edge-generation probabilities, knowledge-pair properties and module attachments are recorded in a generator manifest after validation. Cycle/duplicate/self-edge checks and same-organization constraints are mandatory. Expert domain correctness of a synthetic 10k graph is not inferred; RQ2 tests structural scale, whereas RQ1/RQ3 use the reviewed role catalog.

Use a dedicated research container/volume, or sequentially provision isolated disposable research graphs with explicit manifests. The normal application graph is never reset or replaced. Community-edition database limitations must be respected. The run launcher must positively identify the research instance and snapshot before any setup operation.

## Fixture construction and validation

For each frozen graph, construct 1,000 directed source/target pairs whose **shortest distance** under the exact measured relation filter is 3, 4 or 5. Proposed allocation: 334/333/333 across depths, identical at every scale. Require enough unique pairs; if there are not enough, revise the generator before freeze rather than repeating undocumented pairs. Record any approved repeated-pair workload separately.

Compute distances outside the timed loop, independently using an adjacency-list BFS and verify with Neo4j. Use a deterministic seed and canonical ID ordering; `LIMIT 1000` on an unspecified row order is not a reproducible sample. Validate unique endpoint identity, label, organization, edge status and actual reachability on the frozen snapshot. Each fixture row stores expected hops and snapshot hash. Revalidate on load; mismatch aborts the measured run.

**Proposed Cypher 5 template** (requires validation on the pinned installed version):

```cypher
MATCH (s:MicroSkill {organizationId: $org, id: $startId}),
      (t:MicroSkill {organizationId: $org, id: $targetId})
MATCH p = shortestPath((s)-[:HAS_SKILL_PREREQUISITE*1..5]->(t))
RETURN length(p) AS hops
```

All prerequisite edges in the selected isolated snapshot must satisfy its declared ACTIVE/ownership constraints, or identical property filters must be applied by both BFS and Cypher. Preserve and report knowledge-level properties even though this primary node-path workload does not evaluate a learner's knowledge-level eligibility. `*1..5` allows the query to discover a shorter 1–2-hop path; the fixture validator rejects such a pair. Do not use a minimum bound of three to assert that no shorter path exists. See [Neo4j function documentation](https://neo4j.com/docs/cypher-manual/5/patterns/reference/shortest-paths/).

Create the same relevant endpoint indexes/constraints for each graph. Record `EXPLAIN`/`PROFILE` outputs outside the latency sample; do not assert a particular physical algorithm, index type or per-stage cost without evidence. Returning hops is a deliberately small fixed payload. Full-path serialization, if evaluated later, is a separately named workload.

## Execution and statistical plan

1. Verify dataset and fixture hashes, actual total and label-specific counts, edge counts, indexes, version, memory and CPU limits. Reject any scale mismatch.
2. Record host, OS, JDK, driver, Neo4j/image digest, transport, power mode, background load and container limits. Use identical settings across scales and no unrelated service traffic.
3. Perform 50 untimed warm-up queries from the frozen workload. Pilot-check stability; increase warm-up only through a versioned protocol change before final comparisons. Label results warm-cache; no cold-cache claim.
4. Execute 1,000 timed queries, one client sequentially. Load all fixtures before timing. Use monotonic nanosecond timing from query submission through full result consumption; this includes driver/transport/result overhead, not pure server execution or HTTP/UI rendering.
5. Store **every raw duration**, returned count, actual hops, expected hops and status. No offsets, clipping floors, random jitter or invented fallback hops. A timeout/no-path/mismatch remains a recorded failure; do not silently replace it with a successful sample.
6. Proposed repeated design: three graph seeds per scale and three measured blocks per instance, with balanced scale order and a logged query-order seed. The registered 1,000-query workload is retained in each block; repeats quantify variability, not new independent real-world datasets. Final repetition budget is frozen after pilot.
7. Produce per-block and per-depth Mean, P95 (nearest rank), median, min, max, standard deviation and failure counts. Keep failed-run reports separate; do not accept a “successful RQ2 run” unless all 1,000 prevalidated pairs return expected hops. Do not trim slow successful observations.
8. Report between-block/graph variability. A hierarchical graph/block interval is exploratory with only three graph seeds; do not treat all queries as independent graph-scale replications. Keep distribution plots and raw records. Latency will vary across reruns; reproducibility means traceable comparable methods, not identical milliseconds.

There is no approved universal 100 ms SLA for this research. Do not import UI badges as a success threshold. A final threshold, if required by the supervisor, must be justified before observing final results. Report 10k/1k ratios with uncertainty; three sizes alone do not prove a general asymptotic complexity class.

## Minimum implementation backlog

| Item | Reuse | Required repair and verification |
|---|---|---|
| Scale execution | Existing page, request and service | Bind each scale to validated isolated real data; assert observed counts and snapshot identity |
| Query and fixtures | Driver and fixture reader | Directed prerequisite query, deterministic verified pairs, strict failures; tests for absent nodes, 2-hop shortcut and wrong snapshot |
| Timing | nanoTime plus full consumption | Remove offsets/floor, preserve all raw samples; verify aggregations from hand-known timing vectors |
| Presentation/export | Existing UI and JSON download | Generate comparisons from recorded runs; remove/relabel unsupported phase/causal breakdowns; separate animation from actual telemetry |
| Readiness and parameters | Existing overview/request | No fabricated ready status/counts on outage; validate scope, hops, runs and research instance |
| Evidence | Existing testing patterns | Real Neo4j integration, full raw export count, rerun manifest verification; Playwright for any UI change |

This is a proposed repair plan, not implementation approval or a claim that repairs are complete. A concrete code/data/test revision is reviewed before execution. No extra application-query benchmark is required in the agreed scope.

## Storage and release gate

Use `data/rq2/<generator-version>/<scale>/<seed>/` for graph manifests and fixtures, and `results/rq2/<run-id>/` for all raw timings, query text, environment and summaries. Dataset loader files/scripts belong under `research` when implemented; application fixes retain their existing backend/frontend owners and are referenced from the run manifest.

A pilot may use 100 measured queries per scale to validate the pipeline. It cannot replace a multi-seed 1,000-query protocol. Current status: **Standalone 100-query three-scale benchmark executed (24 November 2026)**.

## Standalone three-scale measured results (24 November 2026)

Executed via [tools/Rq2Standalone.java](tools/Rq2Standalone.java) and [RQ2_LOCAL_SETUP.md](RQ2_LOCAL_SETUP.md) on isolated Neo4j Community `5.26.33` containers with `1.8` directed `HAS_SKILL_PREREQUISITE` edges per `MicroSkill` node, 50 warm-up queries and 100 measured 3–5-hop shortest-path queries per scale:

| Nodes | Prerequisite relationships | Measured queries | P50 (ms) | P95 (ms) | Mean (ms) | Artifact |
|---:|---:|---:|---:|---:|---:|---|
| 1,000 | 1,800 | 100 | 9.24 | 37.16 | 13.51 | [results/rq2-standalone-20261124-172324-1k.json](results/rq2-standalone-20261124-172324-1k.json) |
| 5,000 | 9,000 | 100 | 6.01 | 17.25 | 7.65 | [results/rq2-standalone-20261124-172832-5k.json](results/rq2-standalone-20261124-172832-5k.json) |
| 10,000 | 18,000 | 100 | 12.13 | 51.82 | 18.73 | [results/rq2-standalone-20261124-173041-10k.json](results/rq2-standalone-20261124-173041-10k.json) |
