# REQ-001/002 Role-to-baseline acceptance plan

**Latest execution reconciliation — 2026-10-24:** [REQ-001/002/009 Cluster 4 evidence](system/REQ-001-002-009-cluster4-20261024-evidence.md) maps actual assertions and current gaps: 168 pass/4 fail across BE/FE/synthetic browser, integration Blocked, nine real-stack journeys Not run, numerical/performance Blocked/Not run. Cluster 3/4 incomplete. The23 October “current” notice below is historical; no carry-forward pass. RB01's standalone-page expectation conflicts with the latest confirmed Upskilling Roles(default)/Skills decision; record C4-M01, do not silently rewrite the contract. Proposed filename/TBD tables below are not executed-test inventories.

**Current execution update — 2026-10-23, Cluster 4:** [Synchronized evidence and limitations](system/REQ-001-002-cluster4-evidence.md) supersede the original Planned/Not run statements below for the actually executed RB01–17, VB01–04, MM01–05 and affected regression assertions. Current unique results are 131 Pass/0 Fail/0 final skipped across targeted runs; 122 are carried from Cluster 3 and nine are the post-repair system cases. C3-UI-01/MM05 is repaired and passes; original 127 Pass/1 Fail evidence remains historical. This is not complete production, numerical or performance acceptance. [Actual unit files/methods](unit/REQ-001-002-cluster3-execution.md), [real-adapter files/methods](integration/REQ-001-002-cluster3-execution.md), [browser titles/acceptance mapping](system/REQ-001-002-cluster3-execution.md) and [latest commands/results](../../../../.tools/cluster4/20261023/commands.json) replace proposed file names/TBD commands for executed cases. No test-plan row implies unexecuted branches passed.

Historical planning baseline: 2026-10-23 Asia/Bangkok, Cluster 1 document only. All cases **Planned / Not run**; no test file/method created, runner executed, build or runtime smoke performed for this amendment. [Canonical contract](../technical/baseline/Role%20Selection%20and%20Occupation%20Baseline.md). Prior passes certify only their dated contract.

## Fixtures and trusted actors

Subsequent user decisions: profile is mastery authority; baseline pass means sufficient valid evidence, no score threshold; insufficient-evidence submission never updates profile. Existing learners retain their applicable version, new versions apply to new learners. VB03 now expects existing-Draft continue or confirmed deletion (not silent overwrite); active-assessment Role-change block is confirmed. Prior Blocked-policy labels refer to superseded proposal status; all executable cases remain Not run. RB14 must exercise retained learner version instead of imposing newly added current-catalog skills retroactively. [Partial implementation/build/manual observations](system/REQ-001-002-cluster2-progress.md) are not executable evidence.

Use isolated organization A and B, Employee E1/E2, L&D and unauthorized Admin contexts. Fixture F15 has three current Roles, fifteen distinct required skill IDs and one available full-Occupation baseline; FShared repeats a skill across Role/Level edges; FOther belongs to another Occupation. Mastery fixtures contain 0/14/15 genuine compatible records, one low/zero score, UNKNOWN/null and invalidated evidence variants. None is a development-seed production oracle. Exact fixture release/version/hash and validity policy must be bound before execution; provisional cases remain blocked until approved.

## Acceptance mapping

Each case runs as E1/org A unless the actor column says otherwise. The table retains the initial planned mapping; current executed outcomes and unrun branches are in the Cluster 4 notice above.

| ID / Function | Actor/fixture; trigger | Expected outcome | Planned levels |
| --- | --- | --- | --- |
| RB01 / REQ-001-F01 | E1/F15; sidebar, direct URL, old Upskilling Roles/search links | Independent Target Roles page, preserved applicable search; no Roles tab in Upskilling | FE/system |
| RB02 / REQ-001-F01 | E1/current catalog; list/detail/select string Role ID | Current graph fields and owning Occupation; Level separate; no invented UUID/P3 fields | Unit/contract/real Neo4j |
| RB03 / REQ-001-F01/F02 | E1/deleted legacy selection; open and choose new | Previous selection unavailable, absent from current choices; explicit replacement preserves snapshots/history | API/SQL/FE/system |
| RB04 / REQ-001-F01/F02 | E2/org B, unauthorized Admin; foreign IDs and list/detail/selection | Tenant-safe empty/not-found or authorized denial; no foreign data/write | Security/real adapters |
| RB05 / REQ-001-F02 | E1/F15; initial/change/same-role commands, replay/hash mismatch/stale races | One active selection, exact revision/receipt/audit/outbox; rollback on known failed command | Unit/SQL concurrency |
| RB06 / REQ-002-F01 | E1/F15 with 0 then 14 records; post-selection read | Incomplete; full-Occupation baseline required, never selected-Role-only assessment | Unit/API/SQL |
| RB07 / REQ-002-F01 | E1/F15 with 15 valid records including low/zero; post-selection read | Complete; no baseline start/write, no proficiency threshold | Unit/API/FE |
| RB08 / REQ-002-F01 | E1/FShared; repeated edges and empty/malformed union | Shared skills counted once; empty/malformed union unavailable, not complete | Unit/Neo4j contract |
| RB09 / REQ-001-F02 + REQ-002-F01 | E1; same Occupation Role change then FOther with missing mastery | Reuse same-union coverage; destination independently requires baseline; no old history changes | SQL/system |
| RB10 / REQ-002-F01 | E1/incomplete; missing config/no Active vs infeasible existing version | Chưa có baseline only for absence/unavailable Active; infeasibility has distinct reason; selection retained | API/FE/system |
| RB11 / REQ-001-F02 + REQ-002-F01 | E1; select succeeds, catalog/mastery/read timeout afterward | Selection remains committed; retry read; no false missing state/duplicate selection/automatic attempt | Fault recovery/SQL/FE |
| RB12 / REQ-002-F01 | E1; stale selection/catalog/activation between check and start | Revalidate/reject safely; one attempt at most; no cross-Occupation start | Concurrency/real adapters |
| RB13 / REQ-001-F02 + REQ-002-F01 | E1/in-progress attempt; change Role, reload/resume after deactivation | Existing change guard blocks; original deadline/ID/pins retained; no new start/reset | SQL/system/regression |
| RB14 / REQ-002-F01 | E1/completed profile v1; activate v2/add current skills | Profile coverage stays bound to v1 skill set; no new baseline, profile rewrite or allowance reset | Unit/API/regression |
| RB15 / REQ-002-F01 | E1/missing profile, invalidated or insufficient-evidence attempt | No evidence-only completeness; only a valid finalized outcome initializes profile. Early insufficient submission INVALIDATED/MANUAL; no mastery/profile; linked replacement preserves version | Unit/SQL |
| RB16 / REQ-001/002 | Allowlisted persona vs shell Mode; missing gate/prod/foreign actor | Same trusted E1/org across selection/coverage/start; no client identity override; production denies temporary adapters | Security/system |
| VB01 / REQ-002-F02 | L&D; select Active v1 45/45, edit/save 100/110 | Only sole Draft changes; Active v1 remains 45/45; Draft status; no release number allocated by Save | Unit/API/SQL/FE |
| VB02 / REQ-002-F02 | L&D; switch version/Draft and reload after Save | Correct name/settings/status from identified record, no form leakage; Active pointer summary consistent | FE/system |
| VB03 / REQ-002-F02 | L&D; Create new/Edit while Draft exists, cancel editing, confirm delete/retry/stale delete | Explain existing Draft; continue/cancel or explicitly delete; no second Draft/silent overwrite. Discard only expected ID/revision with immutable receipt; old versions unaffected | FE/API/SQL |
| VB04 / REQ-002-F02 | L&D; stale Draft Save, duplicate/unknown outcome, Preview and Activate | CAS/receipt recovery; preview zero-write; explicit atomic replacement; old version/pinned attempts unchanged | SQL races/API/system |
| RB17 / REQ-001-F01 + REQ-002-F01/F02 | E1/L&D; empty/error/retry and history/config reads | Reads create no selection/Draft/receipt/attempt/mastery/audit/outbox; safe projections/no protected keys | SQL digest/API/security |

## Candidate executable mapping and evidence procedure

Names below are proposals; actual selectors/method names and commands are TBD at separately approved Cluster 3. Do not create or execute these suites in Cluster 1/2.

| Cases | Candidate file/method groups | Planned command family |
| --- | --- | --- |
| RB02/05–15 | backend/src/test/java/.../learning/RoleBaselineFlowTest.java: coverageUnion, incompleteCoverage, lowScorePresent, dependencyRecovery, historicalAllowance | Maven targeted unit selector, exact command TBD |
| RB03–05/09/11–17/VB01/04 | .../RoleBaselineFlowIntegrationTest.java: currentReferences, tenantIsolation, concurrency, immutableVersion, noReadWrites | Maven integration selector, one-time real PostgreSQL/Neo4j Testcontainers; exact command TBD |
| RB01–03/07/10–11/16/VB01–03 | frontend/src/features/employee/target-roles/RoleBaselineFlow.test.tsx and manager version counterpart: navigation, nextStep, versionProjection | Scoped Vitest command TBD |
| RB01–03/06–14/16/VB01–04 | frontend/system-tests/REQ-001-002-role-baseline.spec.ts: roleToBaseline, versionSwitch, resume | Scoped Playwright against approved isolated stack, exact command TBD |

Record actual Function/case, actor+tenant, fixture hash/version, trigger, expected and observed result, file/method, exact command, date/timezone/environment, counts, failure/limitations in per-REQ unit/integration/system evidence. Use disposable real adapters, never development Compose volumes or reset real learner history. Schema mocks/compile/type-check/lint/manual smoke are not executable evidence. Performance budget/dataset/thresholds remain Open; do not invent benchmark passes. Existing result/history, full-union numeric selection, deadlines, idempotency, legacy readers and guard regressions remain required affected coverage.

Confirmed: acceptance boundaries | Proposed: suite names/commands and existing-Draft design | Provisional: local dependency contracts | Open: mastery validity/remediation and performance policy | Rejected: seed-as-oracle, historical pass relabeling or running tests without Cluster 3 approval.

## Profile/result presentation follow-up — 2026-10-23

MM01–MM05 are additional planned checks for the existing profile-read dependency, not new Function IDs. These were initially Planned / Not run; current MM outcomes and method mapping are in the linked execution receipts. Build/manual observations remain separate evidence.

| ID / related scope | Actor/fixture/trigger | Expected outcome | Planned executable mapping |
| --- | --- | --- | --- |
| MM01 / REQ-001/002 profile read | E1 OrgA, zero/one/multiple profiles; GET My Mastery | Own profiles only; empty state; source attempt/version and pinned skill values | Real SQL/API + FE, file/method TBD |
| MM02 / REQ-001/002 + REQ-009 reads | Admin/foreign/inactive actor, tampered IDs, dependency outage | Denial/not-found or retry error, no counts/data leakage and no domain writes | Security/adapter/no-write digest, TBD |
| MM03 / REQ-009-F01 | Original result vs profile, low/zero valid mastery | Separate raw score/mastery/confidence; historical outcome immutable; no score-based retake | API/FE/regression, TBD |
| MM04 / REQ-002-F02 | 45 questions/50min, time clear/re-enter/record switch | Integer inputs; approximate display only; exact3000 seconds and version-isolated values | FE/unit/system, TBD |
| MM05 / REQ-001/002 presentation | EN/VI, keyboard/mobile, submitted-answer review and help | Usable navigation/scroll/help; no answer mutation/key disclosure or false later-learning integration claim | Browser system, TBD |

Current implementation and manual observations: [synchronization review](system/REQ-001-002-final-synchronization-review.md). RB/VB/MM executed assertions and their limits are recorded in the current Cluster 4 evidence; no new scope or automatic cluster transition is authorized.
