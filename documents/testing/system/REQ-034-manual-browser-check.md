# RQ2 v3 — Manual browser checklist

Date:2026-10-21. Functions REQ-033-F02 / REQ-034-F01,F02 / REQ-035-F01. Run after Compose migrations V1–V9 and API/frontend build. Prerequisites: valid ontology source, dedicated research Neo4j healthy, PostgreSQL available, existing Admin portal login. URL: http://127.0.0.1:8088/admin/research (Admin → Research). Other roles must remain unable to open Research.

## 1. Configuration and validation

1. Open Configure RQ2. Expect seeds1,2,3,4,5; distinct pairs per hop500; measured rounds3; all three sizes. Preview up to67,500 attempts, excluded warm-up explanation, RQ1→RQ2→RQ3 order, no second access form.
2. Enter duplicate/negative/fractional/unsafe/empty seeds, zero/fractional/>10000 pairs, zero/>10 rounds, or a configuration exceeding1,000,000. Submit. Expect rejected input, clear feedback and no new run. Existing history remains.
3. Select only1,000 nodes, seeds1,2, pairs7, rounds2. Expect preview84 measured attempts. Submit once; expect one queued/running study, inputs disabled while active. A second concurrent API request returns409.

## 2. Real study, evidence and persistence

1. Watch planning (initial upper bound), then exact frozen denominator. Expect separate seed/size imports, one full warm-up pass per seed/size and two measured rounds. Warm-ups never increase measured progress.
2. On completion expect4 results (2seeds×2rounds), each21 distinct pairs, seven at each depth,21 excluded warm-ups,21 attempts. Without query failures, total84/84; each row success count equals actual pair count. Exact counts may be lower only if the graph lacks enough distinct pairs.
3. Expand Dataset counts and generation timings. Expect2 snapshots, one per seed, with complete node/edge type counts, actual unique count per hop, average/max degree and separate generation/import timings. Download each; verify seed,1000 nodes and workload uniqueness. Pair sets are identical across measured rounds of the same seed/size; order is shuffled reproducibly.
4. Export JSON,CSV,frozen rules,PDF. CSV has84 sample rows plus header when no shortage. Verify per-round Median,Mean and nearest-rank P95 against raw successful samples. Failures are separate outcome rows, count toward attempts and do not enter success latency metrics. PDF discloses failure counts/rate and warm-up policy.
5. Change draft config after completion. Saved results, selected protocol and exports must stay unchanged. Reload and reopen from history. Verify both seeds/rounds preserved. Open an older fixed-N run; no fabricated Median/trial, its original dataset and frozen rules still download.
6. Inspect descriptive variation: sample SD of round Mean values (N/A if one observation), mean/min/max; no averaged P95 or confidence-interval claim. Do not add repeated generation/import times across rounds.

## 3. Failure, access and visual checks

1. In a disposable test environment, simulate measured-query timeout/error: attempts continue without retry, raw/CSV retain outcomes, overall error count includes timeout, metrics use successes only, all-failed groups show unavailable. A completed study may contain failures and must disclose them. Warm-up/import/dependency failure stops the study and disables completed PDF.
2. API restart during execution marks it FAILED; prior snapshots/results remain accessible. Restore services and create a fresh study to rerun.
3. At375px and desktop widths, inspect labels/help, preview, disabled/loading/error state, result/history tables (internal horizontal scroll), downloads and pagination. No page-wide horizontal overflow. Check keyboard access and visible focus.
4. Confirm operational Neo4j/catalog source are unchanged. Only dedicated ResearchNode graph is replaced between seed/size combinations. PostgreSQL retains historical artifacts; no cleanup is implied.

## Historical manual procedure

The following section records the former fixed-N workflow; v3 steps above are current acceptance.

# REQ-033/034/035 — Manual Research RQ2 checks

## Prerequisites and URL

- Start `docker compose -f compose.dev.yml -f compose.research.yml up --build -d` from the project root.
- PostgreSQL migration V8 completed; primary Neo4j and isolated neo4j-research healthy; ontology v0.9.0 seed and RQ2 RULES.md mounts readable.
- Open `http://127.0.0.1:8088/login`, select the existing Admin portal account, sign in once, then select Research. No Research credentials are configured or requested.
- The local demo actor context bridges to the API only in the local profile; production requires a server-authenticated ADMIN principal. Do not run other load tests while collecting reportable latency measurements.

## Checklist

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Research without portal login, then log in as Employee/Expert/L&D Manager and try the direct URL. | Anonymous redirects to portal login. Other roles have no Research menu and redirect to their own portal; API denies missing/non-admin context. |
| 2 | Sign in once to the main Admin portal and select Research. | Opens directly without Administrator access, Username/Password, or Lock access controls. Scope order RQ1 → RQ2 → RQ3; live source/counts/history load. |
| 3 | Uncheck all sizes; enter -1 or a fractional seed. | Submission is rejected, current input preserved. API independently rejects invalid values. |
| 4 | Select 1000 nodes, N=37, seed 42, start. | One 202 run; QUEUED/RUNNING phase and progress; second run blocked. Each size generates/imports before 30 warm-ups and the selected N measured queries. |
| 5 | Refresh/close/reopen while the job runs. | Existing portal context is retained; no extra login. Job persists and keeps running. No duplicate run created by reload. |
| 6 | Wait for the N=37 run to reach SUCCEEDED. | 37 measured samples total; 13/12/12 for depths 3/4/5. Progress max=37, PDF/CSV/JSON and reloaded history retain N=37. For any N, counts follow floor((N+2)/3), floor((N+1)/3), floor(N/3). Warm-up excluded. |
| 7 | Inspect table, counts and environment. | Mean/P95/min/max in milliseconds; exact node count; counts by all six node and seven edge types; source SHA, rule version, seed and real Neo4j version. Generation/import listed separately. |
| 8 | Download JSON and CSV; independently recalculate metrics. | CSV rows equal successful sample count; mean equals sum/n; P95 is sorted ceil(.95*n)-th value, not an average of subgroup P95s. |
| 9 | Download each dataset; rerun with the same seed/source/rules. | Same node/edge/workload content. Query latency may differ. Required fields populated; nullable unreviewed metadata remains null. No fake approval. |
| 10 | Download PDF and run-specific rule Markdown. | PDF opens with run provenance, protocol, aggregate/per-depth results, environment/counts and limitations. Markdown exactly matches frozen rulesMarkdown from raw JSON. |
| 11 | Repeat at 375px width, keyboard navigation and reduced-motion setting. | Sidebar collapses; can reopen; no page-wide horizontal overflow; data tables scroll within their cards. Inputs labelled and focus visible. |
| 12 | In a controlled test, stop only neo4j-research, then start a run. | Run becomes FAILED with a clear failure; successful checkpoints retained; PDF unavailable. Start service again for subsequent runs. |
| 13 | In a controlled test, restart API during a run. | Unfinished run becomes FAILED/Interrupted; stored artifacts remain; new run allowed after recovery. |
| 14 | Point Research at primary Neo4j only in a disposable test configuration. | Same database ID rejected before graph mutation. Primary graph unchanged. Dedicated DB containing a foreign node is also rejected. |
| 15 | Return to main login and sign in as a non-admin role. | Research menu disappears; direct Research URL is blocked and no Research data is fetched for that role. |

## Interpretation

Use the reported warm-cache client latency boundary. 150 ms is only a reference until the NFR statistic is specified. A shortest structural catalog path is not evidence of a valid personalized learning pathway. Catalog data remains pending expert review. PDF is in English; UI supports English/Vietnamese.

Automation: `frontend/system-tests/research.rq2.spec.ts` exercises the real stack. `research.visual.spec.ts` uses labelled fixture responses for layout/state checks and produces no research evidence.

## Verification on 2026-10-21

Real browser workflow and visual fixture workflow both PASS. Actual run `6428ea14-0da3-42df-958d-f5e5fc0c2ca5` completed all 3,000 samples; exports, independent aggregate/per-depth statistics, reload persistence, desktop/mobile screenshots and both PDF pages were verified. See [measured evidence](REQ-034-rq2-research.md). Controlled manual service interruption/restart scenarios remain checklist items; service/Testcontainers tests cover the underlying failure/recovery/isolation behavior.

### Portal-access revision verified

On 2026-10-21, `research.access.spec.ts`, the real 1,000-node smoke workflow and the visual workflow all PASS (3/3). Main Admin sign-in opens Research directly and survives reload. Employee/Expert/L&D Manager have no Research menu and direct Research navigation redirects to their portals. The scope labels are RQ1 → RQ2 → RQ3. See the latest revision section in the dedicated system evidence; previous separate-login instructions and recorded access expectations are superseded.

### Configurable measured queries (rq2-v2)

Change Measured queries per size to 5,000 and select all three graph sizes: preview must show 1,667/1,667/1,666 per size and 15,000 total. Empty, decimal, values below 3 or above 100,000 cannot submit; API rejects them independently. After running N=37 on one size, edit the draft to 5,000: saved progress/history/report remain 37. Historical N=1,000 records remain unchanged.

## Latency seed pagination — REQ-035-F01

Prerequisite: sign in to the Admin portal, have a stored experiment with at least two seeds. URL http://127.0.0.1:8088/admin/research.

1. Open that experiment from Run history. At Latency by graph size and depth, expect Seed[first] and Page1/N; every latency row belongs to that seed, across all its sizes/rounds/depths. Previous is disabled.
2. Choose Next/page number/Last, then Previous/First. Expect only the corresponding seed's rows and correct boundary buttons. Run-history pagination is independent.
3. Select another experiment, then return. Expect first seed again. A single-seed historical run has no latency pager.
4. At375px, use the seed pager and scroll the table horizontally; no page-wide overflow.
5. On page2 export JSON/CSV/PDF. Expect complete study data (all seeds), not just visible rows. No new generation/measurement is started by page changes.

## Dataset count — current UI, 2026-10-23

Prerequisites: Admin portal at http://127.0.0.1:8088/admin/research, catalog loaded, no active study.

1. Configure RQ2 now shows Datasets per graph size / Số bộ dữ liệu mỗi quy mô, default5, numeric integer input1..10. No comma-separated seed field.
2. Select only1000 nodes, count3, pairs500, rounds3: expect maximum13,500 measured attempts. If all three sizes are selected, expect40,500.
3. Enter zero, negative, fractional, empty or >10: submission is blocked. Valid count3 submits seeds[1,2,3]. Do not start a full benchmark just to test field layout.
4. When deliberately running a study, result metadata/history/datasets retain the explicit seeds; count is per graph size, not measured rounds. Old studies remain readable.
5. Check desktop/mobile labels, helper and preview; no horizontal overflow. Rules/measurement and database schema remain unchanged. Earlier seed-entry instructions in this document are historical; replace them with count2 wherever seeds1,2 were requested.
