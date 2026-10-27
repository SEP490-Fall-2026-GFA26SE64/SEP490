# Initial gap/pathway acceptance-to-test plan

Updated2026-10-27. **Cluster1 planning only; every row Planned/Not run.** No executable test file is created or executed by this document. Proposed filenames/method groups/commands below are destinations for a separately approved Cluster3, not evidence that those files exist or pass.

Contracts: [F02](../features/Competency%20profiling%20and%20gap%20analysis/Calculate%20Target-Role%20Gaps.md), [F01 generation](../features/Initial%20pathway%20generation/Generate%20Initial%20Adaptive%20Pathway.md), [shared design](../features/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md), [review](../features/Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md), [include](../features/Pathway%20adjustment/Include%20Pathway%20Module.md), [exclude](../features/Pathway%20adjustment/Exclude%20Pathway%20Module.md), [Employee view](../features/Adaptive%20pathway/View%20Adaptive%20Pathway.md). [Testing guidance](README.md) still applies; no historical baseline test count is carried into this acceptance.

## Actors, fixtures and method mapping

- ORG-A/Employee-A and ORG-B/Employee-B; Expert-A assigned to Role-A, Expert-U unassigned, revoked Expert-R; unauthenticated/other-actor cases. All IDs opaque synthetic fixture identifiers, not production fixtures.
- BR-A explicitly binds catalog Role R and Level L-J; BR-S same catalog Role different L-S. Duplicate/foreign/unpublished/missing bindings included.
- Mastery fixture: SQL0.60 required0.75; Modeling0.80 required0.70; Quality new absent; mandatory/optional flags. Genuine immutable baseline/profile original scope and history; corrupt expected original skill is a separate fixture.
- Graph fixture built in isolated Testcontainers: A/B/C needs, P→foundation of A, shared provider MBC, alternative MA1/MA2, unsuitable/retired/content-missing variants, same-module internal-gate variants and an affected cycle. Every case pins exact graph/policy/content/readiness version.
- instructionLevel fixtures are exact FOUNDATIONAL/INTERMEDIATE/ADVANCED per TEACHES edge; numeric/missing/retired names are rejected by consumer, not silently mapped. Demo seed is not oracle; expected results authored explicitly.
- Policy/readiness fixtures expose approved suitability preference and exact PASS/FAIL/NOT_ASSESSED mapping. Missing contract errors tested; no new mastery→depth or Role-tier→depth formula encoded.
- Every row below inherits actor/tenant fixture plus trigger→expected. Each rule maps to proposed method name equal to rule ID or a descriptive method carrying that ID.

| Suite code | Proposed file / method naming | Proposed command (not run) |
| --- | --- | --- |
| GU | backend/src/test/java/com/adaptlearngraph/competency/domain/TargetRoleGapPolicyTest.java, Gxx_* | backend: `.\mvnw.cmd '-Dtest=TargetRoleGapPolicyTest' test` |
| PU | backend/src/test/java/com/adaptlearngraph/recommendation/domain/InitialPathwayPlannerTest.java, Pxx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayPlannerTest' test` |
| RU | backend/src/test/java/com/adaptlearngraph/pathway/application/InitialPathwayReviewTest.java, Rxx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayReviewTest' test` |
| API | backend/src/test/java/com/adaptlearngraph/pathway/api/InitialPathwayApiBoundaryTest.java, G/P/R/Exx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayApiBoundaryTest' test` |
| INT | backend/src/test/java/com/adaptlearngraph/pathway/infrastructure/InitialPathwayAdapterIntegrationTest.java, G/P/R/Exx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayAdapterIntegrationTest' test` |
| SYS | frontend/system-tests/REQ-041-042-initial-pathway.spec.ts, rule-tagged scenarios | frontend: npx playwright test system-tests/REQ-041-042-initial-pathway.spec.ts |

Package/file names are Proposed until implementation structure exists; later evidence must replace them with actual file/method and exact commands. INT starts one disposable PostgreSQL/Neo4j Testcontainers environment per approved suite, real adapters and fresh migrations; never development Compose volumes. SYS real-stack execution requires separately authorized environment and real contract, not mocked localStorage approval. Unit fake ports verify policy only, not integration.

| Function | Acceptance rule mapping |
| --- | --- |
| REQ-041-F02 | G01–G11; G12 at confirmation handoff only |
| REQ-001-F02 confirmation extension | G03/G08/G11/G12, P01/P12/P13; original selection rules retain their separate historical plan |
| REQ-042-F01 | P01–P14 |
| REQ-020-F01 include | R01/R03–R05/R07/R09–R12 |
| REQ-020-F02 exclude | R01/R05–R12 |
| REQ-019-F01 review/confirm | R01/R02/R08–R12; E04 for downstream denial |
| REQ-004-F01 read | E01–E03/E07/E08; E04–E06 additionally verify dependent content/start-owner gates |
| REQ-046 limited consistency/recovery | G11/G12/P12/P13/R10/R11 only for this flow; no full REQ-046 delivery claim |

All mappings are planned acceptance, not implemented methods. Read-only cases compare before/after learner state, receipts/outbox, selection, baseline pins and pathway pointers in their isolated fixtures; operational request logging is permitted. Identity/assignment unavailability and protected response-cache scope are failure variants, never permissive defaults. Proposal-dependent wire/hash choices require final contract disposition before executable assertions are fixed.

## F02 and confirmation — G01–G12

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| G01 | Employee-A previews explicit roleId+levelId with valid profile; repeat another member Level on same Role | Exact selected-Level requirements/gaps from one immutable profile; stable hash per source, no max/union; reject foreign/nonmember Level | GU/API/INT |
| G02 | Employee-B, unassigned actor or foreign/unpublished/missing/ambiguous binding preview | Deny safe404/403/configuration; scope filtered before output; no mutation | API/INT |
| G03 | Employee-A repeatedly previews different BRs | No selection/archive/request/profile/progress/history writes; no automatic generation | API/INT/SYS |
| G04 | SQL below/equal/above0.75 with stored conservative vs point mastery | max(0,requiredScore-conservative); equality0; display rounding cannot affect decision | GU |
| G05 | Same known mastery with LOW/MEDIUM/HIGH label | Same gap; confidence explanatory only; no second SE penalty | GU/API |
| G06 | One mandatory skill surplus, another deficit; optional deficit | No mandatory compensation; optional does not alter required aggregate | GU |
| G07 | New absent/incompatible skill vs missing expected original data/read outage | Genuine absent→UNKNOWN/null gap+foundation; integrity/outage→error, no fabricated UNKNOWN | GU/INT |
| G08 | Baseline vOld complete; catalog adds mandatory Quality | Learning need without retake/reset/re-score/repin; original profile skill set unchanged | GU/INT/SYS |
| G09 | All mandatory known/gap0; optional gap remains | NO_LEARNING_REQUIRED; no empty path/fake completion/certification | GU/API/SYS |
| G10 | Empty mandatory/malformed/nonfinite requirement input | Invalid configuration, no empty-set success/partial result | GU/INT |
| G11 | Preview Role-B while Role-A current; confirm B; also stale preview/selection/profile/catalog variants | Current preview succeeds and planning hash binds resulting B selection; stale variants409 with no winner overwrite; no hash circularity or client source substitution | API/INT |
| G12 | Same key/body replay after later selection change; key/different body; different-key equivalent input; competing confirmations/write failure | Reauthorize exact receipt before new-command checks; mismatch409; equivalent generation input converges; one effective result/atomic state, no duplicate dispatch or replay-driven selection restore | API/INT/SYS |

Baseline allowance/admission remains existing evidence scope plus new regression; this plan does not claim re-execution of baseline suites.

## Generation — P01–P14

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| P01 | Explicit Employee confirmation with usable current F02; preview/bare GET; missing or in-progress baseline | Only explicit usable intent schedules; accepted PENDING/GENERATING until proposal durable, then AWAITING_EXPERT_REVIEW; baseline-required next step admits no pathway request | API/INT/SYS |
| P02 | A/B/C with shared transitive P and repeated providers | Related graph metadata dedup, no per-skill N+1 adapter calls by default; preserved missing reasons | PU/INT |
| P03 | Valid instructionLevel edges and numeric/missing/unknown/retired field variants | Exact text consumed per pair, malformed contract rejected; no numeric fallback/default | PU/INT |
| P04 | Several providers with owner suitability preferences/duration/price ties | Suitable-depth first, shorter duration, lower price, stable ID; unrelated skill's higher depth irrelevant | PU |
| P05 | UNKNOWN with Advanced-only unsuited provider; missing suitability policy | Foundational-suitability required or unresolved/blocked; no invented mastery/tier mapping | PU/INT |
| P06 | MBC suits B/C; one Module maps other unsuited skill | MBC included once for actual suitable target coverage only; no automatic mastery/PASS | PU/INT |
| P07 | Top provider infeasible; ranked alternative feasible | Whole-path selection tries valid alternative deterministically, not independent top1-only sort | PU |
| P08 | P before A, independent B/C, multi-hop prerequisites | Feasible topo order respects dependencies; independent steps not unnecessarily serial-locked | PU/INT |
| P09 | Same provider teaches prerequisite/dependent with/without explicit internal gate | Valid internal contract represented; absent contract not silently self-loop dropped | PU/INT |
| P10 | Readiness PASS/FAIL/NOT_ASSESSED/mismatched version/missing mapping | Only exact PASS meets access gate; planned readiness step possible with mapping; absent mapping unresolved | PU/INT |
| P11 | Missing content/cycle/no feasible provider/limit exhaustion | Explicit unresolved/limit reasons, no approvable full path or silently removed need/edge | PU/INT/SYS |
| P12 | Same-input concurrent worker/retry/crash before/after commit/outbox delivery; lease expires and old worker resumes; retry exhausted | One effective immutable result/current pointer; only current claim token commits; dedup receipt/outbox; exhausted work explicit failure with no duplicate success | INT |
| P13 | Catalog/selection drift between graph batches/during compute, Role switch, or Expert review started | Reject mixed snapshot; old-selection work cannot commit; history retained, no automatic replacement of review edits or stale publication; owner freshness protocol needed | INT/SYS |
| P14 | Valid complete path needs>5 Modules; outage after partial read | No rank5 truncation; outage not missing-content/UNKNOWN and never partial success | PU/INT |

## Review/adjustment — R01–R12

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| R01 | Assigned/unassigned/revoked/cross-org Expert queue/detail | Authorize before existence/count/paging; no foreign review/evidence | API/INT/SYS |
| R02 | Expert inspects current proposal | Source versions, safe gap/UNKNOWN, unique Modules/targets/depth/reasons/dependencies consistent; no answer keys/theta/SE | API/SYS |
| R03 | Assigned Expert includes eligible alternative | New revision/hash/override history, dedup/recomputed order/validation; no approval/mastery mutation | RU/INT/SYS |
| R04 | Include foreign/unpublished/unsuited Module | Deny or invalid eligibility without partial writes | RU/API/INT |
| R05 | Include already included/exclude absent, expected revision current/stale | Current no-op preserves uniqueness; stale still409; replay safe | RU/INT |
| R06 | Exclude MBC or sole P provider | Draft becomes UNRESOLVED with every affected need/dependency; no fake mastery or auto-readd | RU/INT/SYS |
| R07 | Include suitable replacement after exclusion | New revision can recover VALID; previous excluded action/history retained | RU/INT/SYS |
| R08 | Confirm unresolved/cyclic/missing mapping proposal |422/no confirmation or learning unlock | RU/API/INT |
| R09 | Confirm correct current valid revision/hash vs stale/hash mismatch | Exact approval only; no approval transfer to changed content | RU/INT/SYS |
| R10 | Concurrent distinct edits/confirmation; concurrent identical key/body; same-key/different body | Distinct edits have one CAS winner/409 loser; identical accepted retries return one receipt; mismatch409, no lost edit/stale approval | INT |
| R11 | Dependency outage/write failure/unknown commit; replay accepted revision4→5 edit after revision6; new key with revision4 | Rollback on failed transaction; authorized replay returns original revision5 outcome without reapplying; new stale command409; GET returns current revision6; no approval transfer | INT |
| R12 | No-gap without proposal; initial unresolved without draft vs excluded invalid draft; Role drift/archive/revoked reviewer | No mandatory no-gap approval/fake completion; only existing editable draft repaired; preserve history, restrict stale/archived/revoked scope including receipt replay | API/INT/SYS |

## Employee read/access — E01–E08

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| E01 | Own/foreign/unauthed read or forced learner/org fields | Own only, deny foreign safely, server context authoritative | API/INT |
| E02 | GET in no-request/pending/generating/review/unresolved/blocked/retry/stale/no-gap state, then exact approval | Coherent generation/review/validation fields and EN/VI display; approval ends awaiting-review polling; no GET generation or premature learning links | API/INT/SYS |
| E03 | Approved current sequence with shared targets; current readiness result changes | Unique ordered Modules/frozen reasons/versions consistent with approved hash; live readiness changes lock projection without mutating approved hash/history | API/INT/SYS |
| E04 | Direct content/start API before approval/with old approval | Deny even if UI bypassed; no learning mutation | API/INT/SYS |
| E05 | P readiness absent/fail/pass/version mismatch vs completion-only | Lock/unlock from exact readiness+approval; list position/completion alone cannot pass | API/INT/SYS |
| E06 | Independent Module after another locked branch; same-module internal gate | No artificial global sequential lock; internal gate still respected | API/INT/SYS |
| E07 | Archived path, return to same Role, later baseline Blueprint change | History read-only/no resume; Blueprint alone not erase progress/mastery/archive active path | API/INT/SYS |
| E08 | Readiness/content permission revoked or dependency outage during read/start | Restricted/unavailable; no permissive default or write from projection GET | API/INT/SYS |

## Manual flow planned — not executed

Environment URLs are to be supplied from an approved deployed environment, not assumed available localhost. Reuse existing Target Roles, /expert/pathway-review, /expert/pathway-review/:pathwayId and /employee/pathway surfaces.

1. Employee-A with genuine completed baseline views authorized BR-A gaps; verify SQL/Quality explanations, optional skills and no selection mutation.
2. Confirm Role with retained retry identity; see generating, then awaiting review only after persisted valid proposal.
3. Assigned Expert-A opens queue/detail, excludes sole provider; see all uncovered needs and blocked confirmation. Include valid replacement, inspect recomputed dependencies/order, then confirm exact revision.
4. Employee-A reads approved path; attempt locked direct module access; verify server denial. A separately authorized readiness fixture may provide exact PASS through real owner mechanism to inspect unlocking; do not manufacture learner progress or reset real state.
5. Repeat cross-tenant/stale/replay/failure cases in isolated fixture environment, verify history and no unauthorized writes.

Later receipt must supply actual date/environment/commit, exact fixture IDs, commands/test file/method, counts/results, failures and limits. Static source/JSON/document review in Cluster1 is not execution of these cases.

## Cluster1 document review receipt — 2026-10-27

Source base HEAD1580e44c235423e0961977f2c0949452ab3037aa. Continuation rechecked the same HEAD and source JSON:181 instructionLevel mappings (14/80/87), no numeric OC in current review payload and no instructionLevel in all181 pinned0.9 TEACHES rows. All5471 review nodes/relationships remain NEEDS_EXPERT_REVIEW. No owner validator/importer/test execution, workbook verification or runtime DB check. Scoped git diff --check found no added whitespace errors;24 Markdown files (21 product +3 coordination) and353 local link occurrences were inspected for file targets/fragments/fences, with no new broken links or unbalanced fences. Six pre-existing stale testing-index anchor occurrences are unchanged from HEAD and remain outside this flow's scope; not counted as new-link success. Mermaid source was inspected, not rendered or runtime-validated. Two-space Markdown hard breaks are retained deliberately.

Only documents changed, all unstaged; no runtime/migration/frontend implementation/owner Neo4j source changes, tests/builds/DB/container/Git index operations. This receipt is **document QA**, not executable acceptance. All cases above remain Planned/Not run.

## Numerical/performance and open dependencies

No numerical scoring validation/latency SLA/planner caps certified. Later separately approved measurement should report graph size/degree, candidates/prerequisite closure, query database hits/degree, query/rank/select/sort timings, concurrency, cache state, p50/p95/p99 and memory/error rates with agreed thresholds. Do not substitute a successful small seed request for benchmark or real-pilot acceptance.

Missing owner publication, business Role binding, semantic compatibility, depth suitability, reviewer assignment and actual readiness are named integration blockers for relevant tests. Technical physical schema/job leases/retry budgets remain Proposed design parameters. Current0.10 review package can be an explicit isolated fixture input only, not production truth; Compose0.9 is not ready for instructionLevel consumers.

Confirmed acceptance intent | Planned: file/method/commands | Open: real owner adapters/measurement thresholds | All new executable results: Not run.
