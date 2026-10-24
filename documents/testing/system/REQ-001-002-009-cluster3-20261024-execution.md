# REQ-001/002/009 — Cluster 3 execution receipt, 2026-10-24

Status: **incomplete**. Only Cluster 3 was authorized. No Cluster 4 consolidation, Cluster 5 review, runtime change, migration, dependency installation, learner reset/import/re-score/repin, commit or push. This is the dated execution receipt for the current UI, not a replacement for earlier evidence or a production certification.

Product source: `45413586adea404c8d2928a81af94582b9f2258d`; historical tests/evidence: `c5994b2`. Root/product working trees were clean at intake. Current tests/configs/fixtures are uncommitted; exact source hashes and status are in the [fixture/source manifest](../../../../../.tools/cluster3/20261024/run01/fixture-manifest.json). Existing user deletions were not restored. The user-confirmed Upskilling Roles(default)/Skills navigation supersedes the old standalone-page statement in RB01 for this execution. Canonical contract/test-plan text was not edited.

## Actual executions

Windows; Asia/Bangkok, 24 October 2026. Java21.0.12, Node24.19.0, Chrome155.0.8059.85, Vitest5.0.2, Playwright1.63.0. UI fixture Vite server: loopback28188, demo/adaptive flags=true, exact-origin API interception. No main-stack learner API writes. Raw artifacts are under [20261024/run01](../../../../../.tools/cluster3/20261024/run01/).

| Command ID / runner | Actual result | Scope and report |
| --- | --- | --- |
| be-unit-r1 / Maven targeted11 suites | 62 pass,0 fail/error/skipped | Existing domain, application, MVC, production gates, estimator invariants and history guards; [log](../../../../../.tools/cluster3/20261024/run01/be-unit-r1.log) |
| be-demo-r3 / Maven `-Dtest=LocalDemoSessionTest` | 12 pass,0 fail/error/skipped | New server allowlist, HttpOnly/Path/SameSite cookie, URL/header identity denial, profile/property/prod gates; [log](../../../../../.tools/cluster3/20261024/run01/be-demo-r3.log) |
| fe-final / `npm.cmd test --`13 explicit files | 61 pass,0 fail/skipped | Vitest/component; [JSON](../../../../../.tools/cluster3/20261024/run01/fe-final.json) |
| browser-r3 / `npm.cmd exec -- playwright test --config=playwright.ui-refresh.config.ts` | 14 pass,0 fail/skipped | Real Chrome + synthetic component input; [JSON](../../../../../.tools/cluster3/20261024/run01/browser-r3.json) |
| reflow-r1 / `npm.cmd exec -- playwright test --config=playwright.preview-reflow.config.ts` | 2 pass,0 fail/skipped | Reading offset at150% through320 mobile/844 landscape/expand; [JSON](../../../../../.tools/cluster3/20261024/run01/reflow-r1.json) |
| surfaces-r4 / `npm.cmd exec -- playwright test --config=playwright.ui-surfaces.config.ts` | 17 pass,4 fail,0 skipped | Actual App + intercepted synthetic HTTP; EN/VI320/390/768/1280 and844×390. [JSON](../../../../../.tools/cluster3/20261024/run01/surfaces-r4.json) |
| be-integration-r1 / Maven3 real-adapter suites | **Blocked**; runner8 records:2 setup errors,6 existing assumption skips,0 business-assertion passes | Docker Linux engine pipe unavailable. PostgreSQL/Neo4j Testcontainers never started. No development volumes/URLs supplied. [log](../../../../../.tools/cluster3/20261024/run01/be-integration-r1.log) |
| system-inventory / scoped Playwright `--list` | **9 not-run**,0 system passes | Inventory only; JSON's9 skipped are list-mode records, not acceptance. No isolated Compose stack created. [log](../../../../../.tools/cluster3/20261024/run01/system-inventory.log) |
| test-source-lint / changed FE tests/configs/fixtures | exit0, one Fast Refresh warning in test harness | Auxiliary check, not executable acceptance |

Final executed assertion identities: **168 pass,4 fail** across BE unit/API, FE unit/component and browser fixtures. Do not include historical passes, repeated runs, integration startup records, list-mode system records or lint in that count. Exact CWD/commands/timestamps/exits: [commands.json](../../../../../.tools/cluster3/20261024/run01/commands.json). Per-method/title outcomes and attachment paths: [case-results.json](../../../../../.tools/cluster3/20261024/run01/case-results.json). Actual JUnit reports: [junit-snapshot](../../../../../.tools/cluster3/20261024/run01/junit-snapshot/); the attempted Maven reportsDirectory property did not redirect reports, so current reports were copied from target immediately after execution.

## Acceptance → executable delta

Contract/plans: [Role baseline](../REQ-001-002-role-baseline-flow-test-plan.md), [adaptive baseline](../REQ-002-adaptive-baseline-test-plan.md), [feature contract](../../features/Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md). Each report retains exact file/method/title. Mappings below describe asserted branches, not blanket completion of all acceptance rows.

| Function / acceptance | Keep, update or add; actor/fixture → trigger → expected assertion |
| --- | --- |
| REQ-001-F01 RB01/MM05 | Update AppTargetRoleRoute and two system specs; add EmployeeUpskillingPage/GlobalSearchbar tests. Synthetic Employee/orgA current catalog → old alias/default/explicit tabs/search/keyboard → one Roles surface, query/hash retained on redirect, correct search tab, sr-only h1, no selection write. Real-stack versions remain not-run. |
| REQ-001-F02 RB02/03/05/11/13/17 | Keep RoleBaselineFlow assertions; add loading/empty/outage/retry. Add real mounted-panel tab round-trip → ambiguous selection → same body/key, locked cancel/Escape, no invented selection; current details/Level,12-per-page and resume guard retained. |
| REQ-002-F01 RB12/16 | Add mounted real baseline-hook test: selected orgA15-skill scope → start timeout → collapse summary/change tabs/retry → identical command object/key/body `{entry:SELECTED_ROLE}`, no client actor/tenant fields. |
| REQ-001/002 RB16/DEMO-01 | Add useLocalDemoSession and EmployeeAccessNotice tests, extend LoginPage, add LocalDemoSessionTest. Preset accounts → pending/failed session → storage/navigation wait; unknown accounts/flag-off reject local session;401/403 recovery only on explicit click preserves destination; all server personas get allowlisted scoped HttpOnly cookie. URL/header/localStorage never establishes server identity. Browser successful reload is tested for Employee; other personas have unit/API coverage. |
| REQ-009 AB-R01/03/04, MM01/03/05 | Keep MyMastery zero/one/multiple/version/score-versus-mastery/confidence/help assertions; update shared retry selector. Add BaselinePresentation: submitted answers readonly/no command, history loading/error/retry/empty, original scope/attempt link retained. Actual App browser checks EN/VI/long text; synthetic read-only fixtures. Real tenant isolation/no-write SQL evidence is blocked this run. |
| REQ-002-F02 VB01–04/AB-C05/C11/MM04 | Keep exact version/Draft/CAS/committed-read assertions; add saved-Draft ID+revision preview binding and infeasible/dependency retry activation denial. Browser v1=45/3000s versus Draft=100/6600s stays isolated; no mutation. Four responsive layout failures below do not invalidate the values' observed assertions. |
| REQ-002-F02 Preview/MM05 | New ui-refresh/reflow specs; synthetic5 questions with independently indexed long Unicode prompt/options → traverse all pages → exact concatenation, no loss/duplication/clipping, continuation count, question numbering/jumps, first/last limits, Previous/Next/arrows,80–150%/reset, expand/restore, resize and retained text offset, focus trap/Escape/restore, original body scroll restored. EN/VI desktop/mobile/low landscape; empty/infeasible explicit. No backend-system claim from mocked input. |
| REQ-001/002/009 RB04–17, AB-A02/04/05/06/08/09/S01, VB04 | Keep existing BE business/security/regression assertions. Full union, valid zero mastery, evidence sufficiency/deadline/legacy pins, actor/tenant/identity denial, activation gating and original history are not weakened. Real PostgreSQL/Neo4j races/isolation/no-write checks remain blocked despite passing unit branches. |

## Product failures and gates

**C3-UI-20261024-01**: L&D version and saved Draft overflow with the initial expanded sidebar. At viewport320/390, EN document414px for both records; VI version437px and Draft417px. Four test identities fail; each keeps both layout assertions via `expect.soft` so Draft/value checks continue. The <=viewport condition is unchanged. `surfaces-r4.json` includes layout JSON, overflow element/class/bounds, distinct screenshots, error-context and trace links. The overflow includes long action buttons and capacity/form content in the narrow L&D area. Runtime unchanged; precise root-cause/fix belongs to explicitly authorized Cluster2.

| Gate | Current status / remaining prerequisite |
| --- | --- |
| BE unit/API and scoped FE unit | Pass for executed assertions;74+61 cases |
| Preview browser/reading reflow | Pass for16 fixture cases; independent of backend |
| Current UI responsive acceptance | **Fail**:4 L&D mobile version/Draft cases; requires Cluster2 repair and Cluster3 rerun |
| Real-adapter integration | **Blocked**: Docker engine; rerun3 suites with fresh Testcontainers |
| Real-stack system regression | **Not run**: Docker/isolation prerequisite; rerun9 listed journeys on a new project/volumes, never a populated historical fixture |
| Independent numerical reference | **Blocked/not-run stream**: approved theta/SE vectors/version/tolerance absent; formula/invariant tests are partial evidence only |
| Performance | **Blocked/not-run stream**: dataset/workload/concurrency/duration/environment/threshold unconfirmed |

Earlier test-support errors, interrupted launches, command-quoting failures and reruns remain in [execution-notes](../../../../../.tools/cluster3/20261024/run01/execution-notes.md), raw logs and dated reports. None was converted into a product pass. No new skip or reduced business/security assertion was introduced.

Cluster3 remains incomplete. Cluster4 has not begun. The available handoff package is the command ledger, fixture/source manifest, per-case ledger, JUnit/Playwright JSON, screenshots/traces, failed mobile reproduction and explicit blocked/not-run gates. A future authorized Cluster4 may consolidate these exact outcomes; it must not relabel them as a completed Cluster3/system pass. Cluster5 and canonical navigation synchronization remain separate scopes.
