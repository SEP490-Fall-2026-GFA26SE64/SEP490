# RQ1–RQ3 rerun, 2026-11-26

All three experiments were rerun from commit `74be9cfd` (working tree with unrelated `Demo/` changes only) on Apple M1, 8 GB RAM, macOS 26.5, JDK 24.0.1, Docker 29.2.0. Earlier runs were not overwritten. These remain **pilot** results: expert review of the catalog, RQ1 labels and the RQ3 simulator is still open.

## RQ1: shortlist agreement

- Command: `node documents/research/tools/run_rq1_shortlist_agreement.mjs 20261126-rerun`
- Output: [results/rq1/20261126-rerun/](../../results/rq1/20261126-rerun/report.json)
- Outcome: identical to `20261125-rerun` apart from `runId`. G0 Hit Rate@5 48/50 (96%), C0 41/50 (82%); paired G0 − C0 +0.14 [+0.06, +0.24]; matches per profile G0 better 29, tied 21, worse 0.

## RQ2: directed 3–5-hop shortest path

- Runner: `documents/research/tools/run-rq2-standalone.sh` per scale, three rounds with rotated order (1k→5k→10k, 5k→10k→1k, 10k→1k→5k), sequential, no other workload on the host.
- Setup: `docker compose -f compose.rq2-standalone.yml down -v` before round 1, so every graph was freshly seeded. Neo4j Community 5.26.33 (`neo4j@sha256:c5fd91e4…0aec0`), 256 MB heap, 64 MB page cache, 1.5 CPUs. Random session password, never written to disk. 50 warm-ups + 100 measured queries per run.
- Output: [results/rq2/20261126-rerun/](../../results/rq2/20261126-rerun/summary.json) (nine run files + `summary.json` from `summarize_rq2_runs.py`). No run was excluded.

| Nodes | Edges | Runs | P50 median [min–max] ms | P95 median [min–max] ms | Mean median [min–max] ms |
|---:|---:|---:|---:|---:|---:|
| 1,000 | 1,800 | 3 | 8.23 [8.02–9.26] | 27.61 [13.79–30.82] | 10.08 [8.82–14.01] |
| 5,000 | 9,000 | 3 | 10.52 [9.45–11.45] | 27.32 [17.95–28.65] | 13.16 [10.59–14.94] |
| 10,000 | 18,000 | 3 | 10.13 [10.00–12.84] | 18.35 [16.86–31.45] | 12.25 [10.82–17.14] |

- Reading: all runs were faster than the 25 November rerun (P50 medians 12.77 / 17.79 / 16.34 ms), when the dev stack was also running. As before, there is no monotonic increase from 1k to 10k, and host state affects absolute values more than graph size in this range.
- Limitations unchanged: one graph seed per scale, 100 measured queries per run, exports keep 30 raw timings, no SQL comparison.

## RQ3: pathway efficiency simulation

- Command: `java -cp backend/target/classes:<maven classpath> com.adaptlearngraph.research.Rq3SimulationRunner <scratch root> 74be9cfd`. The scratch root links to `backend/` and `documents/research/data/`, so the runner's fixed output directory did not overwrite `results/rq3/20261125-r2-runtime-parity/`.
- Outcome: `report.json`, `events.jsonl.gz` (decompressed) and `hidden-state.jsonl.gz` (decompressed) are byte-identical to `20261125-r2-runtime-parity`. `run-manifest.json` differs only in `generatedAt`, `runtimeSeconds` and `gitCommit`. Copies of the report, manifest and checksums are in [results/rq3/20261126-rerun-verify/](../../results/rq3/20261126-rerun-verify/); the identical event logs were not duplicated.
- Headline: D(40) S0 0.6128, A0 0.5701, S1 0.5565. ΔD(40) S0 − A0 = +0.0427 [+0.0342, +0.0520]; S1 − A0 = −0.0136 [−0.0177, −0.0098]. A0 wins 72, ties 27, loses 1. Release 49.40% / 61.83% / 64.40%.
