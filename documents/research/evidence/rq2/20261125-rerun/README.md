# RQ2 repeated rounds, 2026-11-25

## Setup
- **Runner:** `documents/research/tools/run-rq2-standalone.sh` + `Rq2Standalone.java`, calling `PlatformGraphBenchmarkService.runBenchmark("<scale>", fixtureSet 1, 100 measured, 50 warm-up, 3–5 hops, directed)`. The service is unchanged since the 24 November runs.
- **Graph:** `rq2-seed.cypher`, MicroSkill nodes with 1.8 directed `HAS_SKILL_PREREQUISITE` edges per node. Observed counts were checked by the service: 1,000/1,800, 5,000/9,000 and 10,000/18,000.
- **Neo4j:** Community 5.26.33, image `neo4j@sha256:c5fd91e41d44858ea678813fd53f8e60602e771a7656c502385247ffbcb0aec0`. Each scale ran in its own container (`compose.rq2-standalone.yml`: 256 MB heap, 64 MB page cache, 1.5 CPUs).
- **Volumes:** dropped before the first round, so each graph was freshly seeded.
- **Host:** Apple M1, 8 GB RAM, macOS 26.5, JDK 24.0.1, Docker 29.2.0. The application's dev PostgreSQL and MinIO containers were also running, but no queries were sent to them.
- **Password:** each session used a random `RQ2_NEO4J_PASSWORD` that was never written to disk.

## Design
Three rounds, with scale order rotated each round to avoid order effects:

| Round | Order |
|---|---|
| 1 | 1k → 5k → 10k |
| 2 | 5k → 10k → 1k |
| 3 | 10k → 1k → 5k |

The scales run sequentially, never in parallel.

**Exclusion:** `rq2-1k-round1.json` is kept on disk but excluded from the summary. During that run, Vite and Playwright ran on the same host (P95 101 ms, max 334 ms). It was redone without other work as `rq2-1k-round1-redo.json`. The 1k volume was reset before the redo because the earlier session's password differed.

## Results
Summary: [summary.json](../../../results/rq2/20261125-rerun/summary.json), produced by `python3 documents/research/tools/summarize_rq2_runs.py documents/research/results/rq2/20261125-rerun --exclude rq2-1k-round1.json`.

| Nodes | Edges | Runs | P50 median [min–max] ms | P95 median [min–max] ms | Mean median [min–max] ms |
|---:|---:|---:|---:|---:|---:|
| 1,000 | 1,800 | 3 | 12.77 [11.10–16.25] | 45.29 [35.78–67.42] | 16.90 [16.67–24.06] |
| 5,000 | 9,000 | 3 | 17.79 [15.79–20.27] | 58.67 [56.84–76.24] | 24.83 [23.47–31.07] |
| 10,000 | 18,000 | 3 | 16.34 [15.39–16.54] | 53.11 [47.36–53.19] | 21.50 [21.00–23.13] |

The single 24 November runs gave P50 values of 9.24, 6.01 and 12.13 ms ([files](../../../results/rq2/20261124-standalone/)).

## Reading
- Run-to-run spread within one scale is as large as the difference between scales.
- No monotonic increase from 1k to 10k is visible.
- The earlier single runs were faster than every run today. Host state therefore affects absolute values more than graph size does in this range.

## Limitations
- One graph seed per scale. The service reuses one fixture set.
- 100 measured queries per run, not the protocol's 1,000.
- Each export keeps only the 30 most recent timings. P50, P95 and mean come from the service's own aggregation, not from stored raw samples.
- There is no SQL comparison, so the results do not compare Neo4j with SQL.
