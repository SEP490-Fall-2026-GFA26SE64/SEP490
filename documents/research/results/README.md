# Research results

Immutable empirical run outputs recorded for the manuscript ([../RESEARCH_MANUSCRIPT.md](../RESEARCH_MANUSCRIPT.md) / [../RESEARCH_MANUSCRIPT.docx](../RESEARCH_MANUSCRIPT.docx)):

- **RQ1 (shortlist agreement, 50 held-out profiles)**:
  - [rq1/20261125-rerun/](rq1/20261125-rerun/report.json), from [RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx](../RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx) and [RQ1_Golden_Set_50_Dong_Thuan.xlsx](../RQ1_Golden_Set_50_Dong_Thuan.xlsx). G0 Hit Rate@5 `96%` (48/50), mean overlap `2.30/5`. C0 `82%` (41/50), `1.28/5`. Paired G0 − C0 `+14 pp` [+6, +24].
- **RQ2 (directed 3–5-hop shortest path, isolated Neo4j 5.26.33, 50 warm-up + 100 measured per run)**:
  - [rq2/20261124-standalone/](rq2/20261124-standalone/): one run per scale. P50 `9.24` / `6.01` / `12.13` ms for 1k / 5k / 10k.
  - [rq2/20261125-rerun/](rq2/20261125-rerun/summary.json): three rotated rounds per scale. P50 medians `12.77` / `17.79` / `16.34` ms. `rq2-1k-round1.json` is excluded because it overlapped with browser tests, and was redone.
  - [../evidence/rq2/20261122-current-service-audit/RESULTS.md](../evidence/rq2/20261122-current-service-audit/RESULTS.md): earlier diagnostic audit of the legacy service. Not a valid scaling result.
- **RQ3 (Adaptive pathway efficiency on 100 profiles × 30 seeded replicates, 40-unit activity budget)**:
  - Current run r2 (runtime parity): [rq3/20261125-r2-runtime-parity/](rq3/20261125-r2-runtime-parity/report.json). `S0` final target distance `0.6128`, `A0` `0.5701`, `S1` `0.5565`; ΔD(40) S0 − A0 = `+0.0427`, 95% CI `[+0.0342, +0.0520]`; S1 − A0 = `−0.0136`; release `49.40%` / `61.83%` / `64.40%`. Includes the policy-facing event log, evaluator-only hidden state, run manifest with engine/input SHA-256, and `SHA256SUMS.txt`.
  - Superseded run r1: [rq3/20261125-r1-superseded/report.json](rq3/20261125-r1-superseded/report.json). Its A0 reimplemented supplementation inside the runner. Kept for history only.
  - Verification record: [../evidence/rq3/20261125/README.md](../evidence/rq3/20261125/README.md).
