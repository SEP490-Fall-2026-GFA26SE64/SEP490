# REQ-001/002 Cluster 3 — execution handoff

**Subsequent 2026-10-23 update:** [Cluster 4 evidence](../system/REQ-001-002-cluster4-evidence.md) records the approved header repair and current passing rerun. This receipt preserves its original Cluster 3 execution date, scope, counts and limitations; statements that Cluster 4/repair were not yet authorized describe that earlier boundary.

2026-10-23, Asia/Bangkok. Product base/current HEAD:480b890352e26612d1991aab4e098724ce68ac41; intake worktree/index were clean. User explicitly approved executable tests for RB01–17, VB01–04, MM01–05 and affected adaptive/security/legacy regression. Work changed tests, fixtures, test-only runner wiring and these required execution receipts. No runtime, algorithm, migration, seed, production configuration, package dependency, commit or push was changed.

The visible flow is Role-first: current catalog → trusted selection/full Occupation processing → PostgreSQL attempt/result/profile/history → safe Employee views. Existing learners keep original evidence/pins. The scoped assertions ran; **acceptance is not all green**.

| Level | Unique Pass | Fail | Final Skipped |
| --- | ---: | ---: | ---: |
| JUnit unit/function/API |62|0|0|
| Vitest component/hook |26|0|0|
| Real-adapter integration |34|0|0|
| Playwright system |5|1|0|
| **Total** |**127**|**1**|**0**|

Counts combine targeted runs by stable test identity. They are not a single128-test command. Earlier fixture/setup failures, worker restart non-runs and six selector-filtered Vitest skips remain in the ledger; corrected cases are counted once. A stale XML for a removed legacy seed test was excluded. Compilation/build/startup never count as executable acceptance.

[Unit receipt](../unit/REQ-001-002-cluster3-execution.md) · [Integration receipt](../integration/REQ-001-002-cluster3-execution.md) · [Exact commands/CWD/exit codes](../../../../../.tools/cluster3/20261023/commands.json) · [Every method/status/report](../../../../../.tools/cluster3/20261023/case-results.json) · [Fixture versions/SHA-256](../../../../../.tools/cluster3/20261023/fixture-manifest.json) · [Vietnamese rerun guide](../../../../../s2%20work/Test%20Guides/REQ-001-002-cluster3-rerun-guide.md).

## System fixture and ownership

Windows/Java21/Maven3.9.11, Spring Boot3.5.16, Vitest5.0.2, Playwright1.63.0, installed Chrome and Docker29.8.1. Exact observed environment/image IDs are retained with artifacts. Test project req001002-c3-20261023 used ports28088(web),28080(API),25432(PostgreSQL),28474/28687(Neo4j) and new project-scoped postgres_data/neo4j_data volumes. Resolved config and volume labels were inspected before launch. Playwright's dedicated config has no webServer/globalSetup/teardown and permits only127.0.0.1:28088.

Current source was built into req001002-c3-backend:20261023. Test provisioning uses existing explicit local-baseline-demo gates and the exact TMP12 synthetic fixture: server-owned employee-a/b/c, ld/admin in Org00000000-0000-0000-0000-000000000001; ontology0.8.0; security Occupation OCC-15-1212.00;135 DRAFT items/15 skills. Fixture hashes: ontology0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125; scope c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231; synthetic artifact089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e. Parameter set e676b9d9-ecb3-34d5-8a4e-8e695b50c870 is a local reference, not approved calibration.

Tests create their own immutable v1(max45,total3000), one edited/discarded Draft(100/6600) and v2(50/3000), then deactivate v2. System tests check coverage/pins/provenance/result-profile equality; they do not expect particular production scores from development content. Partial owner-profile negative fixtures exist only inside disposable Testcontainers, never as a runtime importer.

The owned system project was stopped after artifact capture; volumes, accounts and histories remain retained. No learner reset/re-score/import was used. Main Compose's four container IDs and published ports match before/after inventories; no main Compose write/start/stop command was issued. This is an operational preservation observation, not a claimed full before/after audit of live user data.

## Browser cases

Actual file frontend/system-tests/REQ-001-002-role-baseline.spec.ts; dedicated config frontend/playwright.role-baseline.config.ts.

| Exact test title | Fixture/trigger → expected/observed | Result |
| --- | --- | --- |
| RB01/02/MM05 Role-first alias, search, Level detail, keyboard and EN/VI mobile | Employee B; Upskilling alias preserves search, current Role/Level dialog opens by keyboard, Escape and VI switch work;390×844 mobile should fit. Header overflows to538px. | **Fail MM05** |
| VB01/02/03/MM04 version-specific settings, sole Draft, confirmed discard | L&D v1 shows45/50min; Save100/110min updates sole Draft; Active unchanged; Create new shows existing-Draft notice; Delete requires confirmation and preserves release. | Pass |
| RB04/09/10/16 empty other-Occupation baseline and actor boundaries | Employee B chooses another Occupation; NO_BASELINE, no history; Admin root reads403 and arbitrary persona400. | Pass |
| RB13/15/MM05 answer review, early invalidation, no profile and linked replacement | Employee C starts v1; change409; one saved answer is read-only after reload; early submit INVALIDATED/MANUAL; empty profile; replacement linked. | Pass |
| RB07/14/MM01/03 result/history/profile preserve full scope and sufficient evidence | Employee A provides enough answers;15 skills initialize; original result/profile values agree exactly; own UI/help, foreign404 and retake409. | Pass |
| RB14/VB04 replacement v2 affects new learner, old profile and attempts stay v1 | L&D activates v2; A profile and C attempt remain v1; B first baseline pins v2; deactivation preserves B's existing deadline/questions. | Pass |

C15 ran four passes plus the mobile failure; C17 ran only its diagnostic reproduction and the new v2 regression. [C15 report](../../../../../.tools/cluster3/20261023/playwright-r2.json), [C17 report](../../../../../.tools/cluster3/20261023/playwright-r3.json), screenshots [mobile VI](../../../../../.tools/cluster3/20261023/roles-mobile-vi.png) / [My Mastery EN — now the R04 image; original passing image unavailable](../../../../../.tools/cluster4/20261023/mastery-desktop-en.png). Trace/error-context and mobile-layout JSON attachment are under [failure artifacts](../../../../../.tools/cluster3/20261023/playwright-artifacts/). Screenshots were opened for inspection; this is not a second executable pass or a separate manual-browser acceptance claim.

## Acceptance-to-executable mapping

These are bounded observed assertions; production-owner completion and the unapproved numerical/performance policies below are not implied.

| ID / Function | Confirmed expected behavior | Executed evidence / actual |
| --- | --- | --- |
| RB01 / REQ-001-F01 | Independent Role entry/aliases/search | App route, CurrentRolePanel search/pagination, actual Upskilling alias/direct page. Navigation assertions passed; shared mobile shell fails MM05. |
| RB02 / REQ-001-F01 | Current string IDs/Occupation/separate Levels | Real Neo4j F15 and real UI detail passed; no UUID/P3 fields invented. |
| RB03 / REQ-001-F01/F02 | Removed selection retains old snapshot; explicit replacement | RoleBaselineFlowTest deleted-selection branch + real SQL selection history/replacement assertions passed. |
| RB04 / REQ-001-F01/F02 | Wrong actor/tenant/own-record boundaries | Current API403, real graph/SQL tenant exclusion, inactive transaction denial, foreign result404 and Blueprint pre-query denial passed. |
| RB05 / REQ-001-F02 | Single current, no-op, replay/CAS/rollback/race | Current SQL selection concurrency/history/receipt/digest tests and FE exact retry passed. |
| RB06 / REQ-002-F01 | 0/partial coverage requires full Occupation handling | F15 union forwarding14/15; F3 real partial/null/UNKNOWN profile never COMPLETE; first-use and early insufficient evidence passed. Incomplete-profile remediation remains owner policy. |
| RB07 / REQ-002-F01 | Valid low/zero mastery counts; no score threshold | Zero initializer unit; all-wrong real SQL raw0 still initializes; genuine system15-skill result/profile passed. |
| RB08 / REQ-002-F01 | Deduplicate shared skills; malformed/empty unavailable | F15 graph/flow union, empty union and ambiguous owner negatives passed. |
| RB09 / REQ-001-F02 + REQ-002-F01 | Same Occupation reuses coverage; destination independent | Role-B coverage reads original profile; current selection history preserved; actual other Occupation shows NO_BASELINE. Passed bounded assertions. |
| RB10 / REQ-002-F01 | No Active versus infeasible/dependency | Real NO_BASELINE versus BASELINE_UNAVAILABLE and no-write digests; explicit API error and browser absence state passed. |
| RB11 / REQ-001-F02 + REQ-002-F01 | Read failure after committed selection retains success | FE GET-only reconciliation and exact unknown-write retry passed; no duplicate PUT after known success. |
| RB12 / REQ-002-F01 | Revalidate start; one winner/no wrong scope | Real trusted-context stale selection, activation/start race and concurrent answer/CAS/replay passed. |
| RB13 / REQ-001-F02 + REQ-002-F01 | Active assessment blocks Role change; original resume | Real API/SQL/browser preserve ID/deadline/pins and block change; v2/deactivation resumes passed. |
| RB14 / REQ-002-F01 | Old profile/attempt stays original version/scope | SQL original required-set read and real system v2/new-learner versus v1/profile/old-attempt assertions passed. |
| RB15 / REQ-002-F01 | Sufficiency initializes atomically; insufficiency no mastery | Real early INVALIDATED/MANUAL, linked replacement, no profile, rollback/exact retry and genuine missing-profile pending passed. |
| RB16 / REQ-001/002 | Trusted actor; gate-off/prod; no override | Current controller profile/property registration, unknown identity fields, real persisted active-role/tenant reload and local-persona denial passed. Production Identity remains unintegrated. |
| RB17 / REQ-001-F01 + REQ-002-F01/F02 | Safe/no-state-change reads and bounded queries | All-platform-table digests for profile/result/history/list/Preview plus graph before/after, empty/error paths and query bounds passed. |
| VB01 / REQ-002-F02 | Save modifies sole Draft, no release/Active mutation | Real SQL Save/no-op and browser45/3000 Active versus100/6600 Draft passed. |
| VB02 / REQ-002-F02 | Identified version/Draft settings never leak | Real browser version and React historical-v1/current-v2/Draft switch with exact3000sec passed. |
| VB03 / REQ-002-F02 | Existing Draft notice; confirmed ID/revision discard | Real browser no overwrite/confirmation, SQL discard receipt replay, stale ID/URL and FE exact retry passed. |
| VB04 / REQ-002-F02 | CAS, zero-write Preview, atomic replacement/recovery | Real Draft/activation races, receipt-insert rollback and Preview digest; FE binding/retry; system retained versions passed. |
| MM01 / profile boundary | Empty/one/multiple own profiles and provenance | Real SQL empty/one/two Occupations + FE multiple profiles + real system15-skill values/source v1 passed. |
| MM02 / profile + REQ-009 | Denial/outage/invalid own state without leaks/writes | MVC403/503, foreign/empty SQL, partial-profile explicit failure, FE retry and digests passed. |
| MM03 / REQ-009-F01 | Separate raw score/mastery/confidence; immutable outcome | FE raw100% versus mastery0%; real raw0 sufficient result; system exact original result/profile equality and no retake passed. |
| MM04 / REQ-002-F02 | Whole inputs/display approximation preserves seconds | FE clear/re-entry retains3000; identified record switch45/50min versus100/110min; Unicode/integer/time bounds passed. |
| MM05 / presentation | EN/VI, keyboard/mobile/help and immutable review | EN/VI switch, keyboard detail/Escape, immutable submitted review and honest profile help passed. **Fail C3-UI-01: mobile header causes horizontal overflow538>390.** |

## Runtime defect requiring separate Cluster 2 scope

**C3-UI-01 / MM05:** expected no horizontal page overflow at390×844 after switching Target Roles to VI. Actual document.scrollWidth=538, innerWidth=390. The right header control group extends to537.828125px, including language/notification/account controls. Assertion at frontend/system-tests/REQ-001-002-role-baseline.spec.ts:47 remains failing. Related source: frontend/src/shared/layouts/WorkspaceLayout.tsx:545–604, especially the right shrink-0 control group at604. Source location identifies the observed offending surface, not a completed root-cause fix.

Reproduce using the owned local fixture: Employee B, /employee/target-roles?search=Security, choose VI,390×844 viewport. The same failure occurred in C15 and diagnostic C17; no assertion was weakened and no runtime style was edited. A separate explicit implementation scope is required to fix the shared header and rerun MM05 plus affected responsive/navigation checks.

The earlier same-role response-indicator concern and payloadVersion2 consumer compatibility remain separate source/owner findings. Persistence no-op/revision/event behavior passed; this does not certify an unspecified new response indicator or downstream decoder.

## Blocked / Not run and handoff

- **Blocked/Not run — numerical reference stream:** exact3PL closed-form and structural all-correct/wrong/coverage invariants passed. Independent theta/SE/convergence/adversarial golden vectors, approved versions and acceptance tolerances are not supplied. No production model/calibration validity or psychometric benchmark is claimed.
- **Blocked/Not run — performance stream:** approved dataset cardinalities, workload/concurrency, duration, environment and pass thresholds remain Open. No arbitrary performance target/pass was invented.
- **Not run — production-owner end-to-end:** real Identity/session/grants/revocation, reviewed catalog visibility/publication, approved content/model/pilot, later-learning profile updates/REQ-041 delivery, other assessment families/pathway archive and downstream synthetic-data exclusion remain owner dependencies. Local adapter tests and persisted account revocation checks do not complete those integrations. Populated-deployment forward upgrade is not certified by fresh migrations/legacy read fixtures.
- Documentation conflicts were recorded in the unit receipt; the current confirmed Role-first contract governed. Existing dated test-plan/README statuses were not relabeled. These receipts fulfill the explicit Cluster3 delivery request; broader Cluster4 evidence synchronization has not started.
- No stage/commit/push/history rewrite. Required next choices: separately approve the C3-UI-01 Cluster2 repair, or approve **Cluster4** to document this evidence with the retained Fail/Blocked outcomes. Cluster5 remains unstarted.
