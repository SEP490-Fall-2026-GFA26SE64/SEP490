# Research results

Immutable empirical run outputs recorded for the manuscript ([../RESEARCH_MANUSCRIPT.md](../RESEARCH_MANUSCRIPT.md) / [../RESEARCH_MANUSCRIPT.docx](../RESEARCH_MANUSCRIPT.docx)):

- **RQ1 (Recommendation agreement on 50 held-out profiles)**:
  - Baseline profiles workbook: [../RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx](../RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx)
  - Consensus reference workbook: [../RQ1_Golden_Set_50_Dong_Thuan.xlsx](../RQ1_Golden_Set_50_Dong_Thuan.xlsx)
  - Result summary: `G0` Hit Rate@5 = `96%` (`48/50`), mean exact overlap `2.30 / 5`; `C0` (TF–IDF) Hit Rate@5 = `82%` (`41/50`), mean exact overlap `1.28 / 5`.
- **RQ2 (Directed prerequisite shortest-path latency on isolated Neo4j 5.26.33 graphs, 50 warm-up + 100 measured queries per scale)**:
  - 1,000 nodes / 1,800 prerequisite edges: [rq2-standalone-20261124-172324-1k.json](rq2-standalone-20261124-172324-1k.json) (`P50 = 9.24 ms`, `P95 = 37.16 ms`, `Mean = 13.51 ms`)
  - 5,000 nodes / 9,000 prerequisite edges: [rq2-standalone-20261124-172832-5k.json](rq2-standalone-20261124-172832-5k.json) (`P50 = 6.01 ms`, `P95 = 17.25 ms`, `Mean = 7.65 ms`)
  - 10,000 nodes / 18,000 prerequisite edges: [rq2-standalone-20261124-173041-10k.json](rq2-standalone-20261124-173041-10k.json) (`P50 = 12.13 ms`, `P95 = 51.82 ms`, `Mean = 18.73 ms`)
  - Note: The earlier diagnostic audit of the legacy mixed-relation service is preserved under [../evidence/rq2/20261122-current-service-audit/RESULTS.md](../evidence/rq2/20261122-current-service-audit/RESULTS.md).
- **RQ3 (Adaptive pathway efficiency on 100 profiles × 30 seeded replicates, 40-unit activity budget)**:
  - Current run r2 (runtime parity): [rq3/20261125-r2-runtime-parity/](rq3/20261125-r2-runtime-parity/report.json). `S0` final target distance `0.6128`, `A0` `0.5701`, `S1` `0.5565`; ΔD(40) S0 − A0 = `+0.0427`, 95% CI `[+0.0342, +0.0520]`; S1 − A0 = `−0.0136`; release `49.40%` / `61.83%` / `64.40%`. Includes the policy-facing event log, evaluator-only hidden state, run manifest with engine/input SHA-256, and `SHA256SUMS.txt`.
  - Superseded run r1: [rq3-pilot100-20261125.json](rq3-pilot100-20261125.json). Its A0 reimplemented supplementation inside the runner. Kept for history only.
  - Verification record: [../evidence/rq3/20261125/README.md](../evidence/rq3/20261125/README.md).
