# RQ2 current service diagnostic audit — 2026-11-22
Status: execution completed; scientific acceptance FAIL for scale fidelity and fixture validity. Not a final RQ2 experiment.

## Scope and execution
Compiled the current PlatformGraphBenchmarkService.java and GraphBenchmarkDto.java into temporary classes using dependencies extracted from existing backend/target/adapt-learn-graph.jar. Invoked service methods directly through a temporary Java main with actual Neo4j Driver and Jackson/Spring provider. No API, authentication, frontend or Playwright execution; application remained stopped to avoid unrelated workers/seeds.
Started only the previously stopped existing development Neo4j container. No Cypher writes, seed, migration or reset. Actual database Neo4j5.26.32,1059nodes,4795relationships before and after. Host Java24.0.1; dependency artifacts are locally available, not newly installed. Timing environment is a local diagnostic pilot, not a calibrated benchmark.

## Fixture validation
Used same path predicate as service (undirected mixed relationship types, id/code endpoint match), returned length rather than full path. Checked first100 entries per set against current actual DB; timeout5s/query. No generalization to every fixture or historic dataset.
Set1:100 checked,79 no result,4 paths below3hops,17 valid3–5;5 returned hop counts differ from metadata.
Set2:100 checked,81 no result,4 paths below3hops,15 valid3–5;7 returned hop counts differ from metadata.
Set3:100 checked,65 no result,6 paths below3hops,29 valid3–5;9 returned hop counts differ from metadata.
Total225 no result,14outside3–5,61valid out of300. No result means query returned no path; it does not distinguish absent endpoint from unreachable path.

## Service run outputs (NOT valid graph-scale comparison)
Each requested100 timed runs+50warmups,set1,minHops3,maxHops5,executeOnLiveCatalog=true.
1k reports1098nodes,mean12.88ms,p9521.01ms.
5k reports5000nodes,mean26.64ms,p9560.26ms.
10k reports10000nodes,mean30.05ms,p9564.26ms.
Actual graph remained1059nodes/4795edges for all runs. These are response values AFTER existing synthetic offsets/floor, not unaltered measurements. All responses retained30timings/10path samples only. Successful method completion does not prove valid benchmark.

## Findings confirmed
- Scale selector changes reporting/fixture and synthetic timing correction, not actual scale.
- No-path/out-of-range pairs not rejected; displayed samples may use fixture hops when no real path returned.
- Full raw100 measurements absent from response; only30retained.
- Fixed scale table and proportional step breakdown remain source-defined, not measured phase attribution.

## Evidence
execution.txt: run output, actual counts and service summaries.
fixture-validation.json:300 pair-level records and actual/null hops.
overview.json:live overview.
run-1k.json,run-5k.json,run-10k.json:unmodified response exports.
Audit.java:temporary diagnostic harness; no product source changes.

## Proposed minimum repair, not implemented
Create isolated versioned real scale datasets, verify actual counts and indices, validate all pairs against frozen snapshot and correct workload/hops, remove all simulated timing adjustments, persist every raw sample plus run manifest/errors, recompute aggregates and comparative table from actual runs, remove/relabel unsupported breakdown claims, add backend/integration assertions and UI tests if presentation changes. Keep current UI/API where reusable; no need to expand registered RQ2.

## Retained evidence provenance

These artifacts were copied from the temporary diagnostic audit directory on 22 November 2026. JSON response exports and the Java harness are retained without changing their content; execution.log was renamed execution.txt for repository storage. The harness contains temporary execution paths and is an audit record, not a portable ready-to-run experiment. This report corrects the retained log filename and clarifies provenance. SHA256SUMS.txt records the delivered evidence bytes; it does not prove the historical product source revision. Source hashes were not captured at execution, so no exact historical source snapshot is asserted. The framework preparation revision is recorded separately.
