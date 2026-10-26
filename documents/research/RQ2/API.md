# RQ2 v3 — API and persistence contract

Base `/api/v1/admin/research`; existing portal ADMIN context, no separate Research login. Local profile only: X-User-Id + X-User-Role: ADMIN. Outside local: authenticated ROLE_ADMIN; spoofed headers ignored. POST requires session CSRF cookie/header token. Errors: 400 invalid input, 401/403 access, 404 missing artifact, 409 active run/unfinished PDF, 503 unavailable dependency.

## Endpoints

- GET `/session`: username, csrfToken, csrfHeader.
- GET `/catalog`: sourceVersion/sourceHash/nodeCounts/edgeCounts/sizes/rulesVersion; defaultSeeds=[1,2,3,4,5], defaultPairsPerHop=500, maxPairsPerHop=10000, defaultRounds=3, maxRounds=10, maxSeeds=10, maxTotalQueries=1000000. Legacy iterations/minIterations/maxIterations/warmup remain for compatibility.
- POST `/runs`: `{ "seeds": [1,2,3,4,5], "sizes": [1000,5000,10000], "pairsPerHop": 500, "rounds": 3 }`, returns 202. Required integer fields; 1..10 distinct safe nonnegative seeds; distinct supported sizes; pairs1..10000, rounds1..10; configured upper total <=1000000. No mixing seeds with legacy seed/iterations.
- GET `/runs`: latest50, summaries without samples or frozen rule text.
- GET `/runs/{id}`: summary with persisted status/progress/configuration.
- GET `/runs/{id}/raw`: full JSON, including raw success/error samples and frozen rules.
- GET `/runs/{id}/datasets/{size}?seed=1`: exact frozen graph/workload. Omitted seed uses run.seed (first seed, including legacy runs). 404 if unavailable.
- GET `/runs/{id}/samples.csv`: seed,round,nodes,iteration,hops,start_id,module_id,latency_ms,returned_hops,outcome,error. Includes failures; count rows against attempted, not only success N. Formula-like string cells escaped.
- GET `/runs/{id}/report.pdf`: SUCCEEDED only. Configuration, each seed/round/hop, Median/Mean/P95, errors, descriptive variation, structures, environment and limitations.
- GET `/rules.md`, `/runs/{id}/rules.md`: current/frozen Markdown respectively.

## Run JSONB fields

Preserved: id UUID; createdBy identity; status QUEUED/RUNNING/SUCCEEDED/FAILED; createdAt/finishedAt; seed (first study seed); sizes sorted; sourceHash/sourceVersion; rulesVersion; iterations; warmup; completedQueries; phase/failure; environment; rulesMarkdown; results.

New optional `protocol` (null only for legacy): seeds long[], pairsPerHop int, rounds int. `totalQueries` int: configured upper bound initially, exact actual plan when `planReady` boolean=true. Planning freezes all snapshots before measured execution. `iterations` v3 is configured maximum measured attempts per seed/size (pairsPerHop*3*rounds), not the actual total; `warmup=0` is a legacy compatibility slot, actual warm-ups are per Trial. UI/progress use totalQueries. Historical missing totalQueries derives sizes.length*iterations; no historical protocol/median/trial is fabricated.

Result: nodeCount,edgeCount,nodeCounts,edgeCounts,generationMs,importMs,overall,byHop,samples; new `trial` for v3: seed,round (1-based),uniqueByHop (actual counts3/4/5),warmupQueries,structure {averageDegree,maxDegree},attempted,errors,timeouts. Generation/import values repeat on each round of the same seed/size for provenance; do not sum them across rounds. Structure uses in+out degree over all relationships. Partial checkpoints have the full selected workload counts but only completed attempts in sample statistics.

Metrics: count(success N),meanMs,p95Ms,minMs,maxMs,medianMs(new nullable Double). Empty-success groups store count0, numeric metrics0, medianMs=null, display N/A. Historical median null displays unavailable. Sample: iteration zero-based within round; hops,startId,moduleId,latencyMs,returnedHops; new outcome SUCCESS/ERROR/TIMEOUT (missing legacy defaults SUCCESS), error null on success, sanitized text otherwise. Failed elapsed times are retained separately from successful latency statistics. Timeouts are included in errors, not added twice.

Graph unchanged: nodes(label,complete properties),edges(type,fromId,toId,complete properties),workload(hops,startId,moduleId),sourceHash,sourceVersion,seed,nodeCounts,edgeCounts. New generation caps distinct workloads at requested pairsPerHop instead of256. Operational ontology and nullable review metadata remain unchanged.

## Storage and migration

V27 research_run: id/status/created_by/created_at/payload, single active run partial index. V28 research_graph: run_id FK,node_count,seed bigint NOT NULL safe-range check,payload; PK(run_id,node_count,seed). Backfill seed from each existing payload before replacing PK. ResearchStore has a seed-qualified lookup; old lookup defaults to run.seed. All snapshots and full raw samples are retained, not silently deduplicated/deleted. PostgreSQL owns protocol/trials/timing, dedicated Neo4j owns only the current imported graph, replaced between seed/size combinations.

Legacy POST `{seed,sizes,iterations}` remains accepted with iterations3..100000/default1000 and warmup30. New UI creates v3 only. Historical raw/rules/dataset exports and stored counts are preserved; new CSV adds seed/round/outcomes for legacy too. Missing historical Median is not backfilled from summary data. See [rules](RULES.md).

UI draft defaults and bounds come from catalog; summaries poll every5seconds. Polling excludes raw samples/rules text; raw endpoint retains complete evidence.

Latency seed pagination is client-side over the existing run summary. No endpoint/filter/persistence changes; downloads still return the complete study.

## Dataset count UI — 2026-10-23

UI uses Datasets per graph size (integer1..maxSeeds, default defaultSeeds.length), not a comma-separated seed list. It submits the existing seeds:[1,...,N] payload; there is no new datasetCount API field or migration. Backend callers may still supply valid explicit seed arrays. Reports/history preserve actual seeds, including historical custom arrays.
