# REQ-034 — Admin login 502 recovery, 2026-10-26

## Diagnosis (observed)

Frontend `useLocalDemoSession` POST returned502 because no healthy API upstream was running. Existing `adapt-learn-graph-dev` migrate/API exited1; seed remained Created. PostgreSQL read-only history confirmed V8__rq2_research.sql and V9__research_graph_seeds.sql. The merged V8/V9 are baseline migrations, so Flyway rejected the mismatch. API started without a bank then failed with `Provision official bank first`. Research Neo4j had exited137 historically.

## Recovery scope

Use a new `adapt-rq2-v09` Compose namespace with dedicated PostgreSQL/operational/research Neo4j volumes; enable compose.research.yml and move web8088 to it. Old project containers stopped to release ports/CPU/RAM; every old volume and row retained. No database history edits, repair or graph reset. No authentication bypass or application-code change.

## Verification

- Clean backend package:11 tests passed (ManyToManyCatalogContractTest,LocalResearchSecurityTest,ResearchSecurityTest,HexagonalArchitectureTest),0 failed/skipped.
- Frontend:22 tests passed across LoginPage,ResearchPage,useLocalDemoSession.
- Fresh Compose: migrate/seed exited0; API,PostgreSQL and both Neo4j instances healthy; web running on8088. Original login proxy POST now returns204.
- Real Playwright: **2 passed** using research.access.spec.ts and research.rq2.spec.ts (3.4minutes total). Actual Admin login → dashboard → Research → reload passed; anonymous/non-Admin access denied. A real smoke study with1000 nodes,seeds1/2,pairsPerHop2,rounds2 completed24/24 measured attempts across4 trials,0 errors/timeouts. Run `40da018c-5c52-486f-af92-0b2fe3b1bcbf` is retained in the new workspace.
- PDF/JSON/CSV/frozen rules and both seed datasets downloaded; raw-sample mean/median/P95,per-hop counts,CSV rows and frozen workloads cross-checked by the existing E2E spec. Desktop and375px mobile/reload assertions passed. This is functional smoke validation,not a full research/performance study.
- The recovered workspace is intentionally left running for the user. Only old containers are stopped; old volumes/history are not modified.

## Independent manual procedure

[URL, prerequisites,steps and expected results](../../research/RQ2/LOCAL_SETUP.md#manual-checklist). The recovery creates a new study history; retained old Research results require explicit reviewed import/reconciliation if needed.
