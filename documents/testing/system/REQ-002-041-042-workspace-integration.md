# REQ-002/041/042 workspace integration — C2 source/build receipt

Source/build date: 2026-10-28; final static/Git follow-up: 2026-10-29, Asia/Bangkok. Scope: main `9b76905c4a2560300efb44ef4d1bc44b559e85ab` merged without commit into Generate-Initial-Adaptive-Pathway at `b2ed102a41b2101c4f2bc9a1c2afae80bab8525d`. The source checkpoint below retains its original build/static scope. [29 October runtime follow-up](#c2-runtime-follow-up--2026-10-29) records subsequently authorized Compose/manual HTTP observations; no executable tests or browser acceptance are claimed.

## Source and conflict disposition

The following source checkpoint is retained history. The newer SE observations are recorded next; they do not establish executable-test or browser acceptance.

## Git handoff — 2026-10-29

At the user's explicit request, the pending main integration was committed as `f790cdb` with parents `b2ed102` and `9b76905`; its tree is exactly the preserved checkpoint `afe072a0a4d18e07fb8fe7b574e47ad484a17e8b`. The later work is grouped into backend commit `d59b0c3` (24 files), frontend commit `0b734f6` (6 files), and the documentation commit containing this record. Recoverable index/merge metadata, staged/working binary patches and untracked file copies are retained under ignored workspace `.tools/git-checkpoints/20261029-before-grouped-commits/`. Historical Markdown whitespace findings in the original merge checkpoint were retained without unrelated formatting edits; the new grouped changes pass their whitespace checks. No new executable tests, history rewrite, data mutation or push was performed for these commits. The planned code/document/SRS reconciliation remains a separate follow-up, not completed by committing these records.

## Expert adjacent order and neutral Remove — 2026-10-29

Subsequent acceptance reported by the user: happy-case UI testing succeeded for the Move Up/Down and Remove behavior. Record this as user-confirmed manual acceptance only, not agent-observed browser evidence or an executable-test/C3 pass. Negative/security/concurrency/responsive cases remain limited to the actual evidence below or planned follow-up.

Authority: user explicitly approved Move Up/Down and Remove, then separately approved the required backend/API and CHECK expansion after schema/CRUD clarification. Scope REQ-019-F01/REQ-020-F01/F02 draft review; no Module/Skill/Role/Occupation management CRUD, graph/schema change, generation objective/selection algorithm change, learner override, production/native-migration cutover or executable C3. Contract amendment and acceptance mapping are in the existing review/include/exclude/shared-flow documents and initial-pathway test plan. These supersede the earlier disabled placeholders, not historical evidence.

Implementation: InitialReviewOrder applies saved Expert order after fresh fixed-set planning, validates actual provider/gate/external-readiness dependencies, rejects inversions with422 and structured diagnostics/no write, and preserves valid relative order while placing newly included prerequisites. Review/controller add POST `/api/v1/expert/initial-pathways/{id}/moves` and `/removals` with expected revision/hash/key and existing actor/org/assignment/selection/binding/receipt/CAS guards. MOVE_UP/MOVE_DOWN and neutral REMOVE create immutable revisions/ordinals/hashes/history; Check/preview/Confirm revalidate without discarding explicit order. Remove is distinct from EXCLUDE and returns eligible modules to Catalog. Required-provider removal remains editable UNRESOLVED; existing approval denial applies. UI uses the original arrows/trash/rows/components with pending/first-last/approved locks and EN/VI prerequisite popup; legacy persona controls remain disabled and its route allowlist is unchanged. Check reload-only-on-hash-change behavior is retained. No shared workspaceFetch/CSRF change.

Before rollout, stopped API/embedded worker, captured17 table count/content aggregates, and took full PostgreSQL custom backup to ignored workspace `.tools/db-backups/20261029-expert-order-remove/before.dump`:2816639 bytes,SHA256 `75bb9828ca011d994a1d546aa9f7bb354b2eb9407eb9797bffaecedd488c4c6e`. Backup creation/copy/hash observed; full restore not exercised. `docker compose up -d` applied V35 through the standard migrate job; all readiness/seed jobs exit0. Readback: Flyway35 success; initial_pathway_override_action_check permits exactly INCLUDE/EXCLUDE/MOVE_UP/MOVE_DOWN/REMOVE. No old migration repair/edit/table/column change or learner/pathway row change from migration: all17 aggregates matched exactly after startup. Final image loaded with `docker compose up -d --no-deps api` after the final order-placement refinement; API/PG/Neo4j healthy/web running. No catalog unseal; Neo4j remains994 nodes/5124 edges/read-only/online.

| Build/static command | Actual outcome | Limits |
|---|---|---|
| `docker compose build api` | Final Java21.0.12.1/Maven3.9.11 package428 sources BUILD SUCCESS at15:00:55+07; image config `sha256:0e601a7d6ff1b256a8375e5f87cfe602d32f79c59fbd5cdcc4ffc2d53cfec217` | Dockerfile `-Dmaven.test.skip=true`; test resources/compile/execution entirely skipped |
| `docker build --target build -t adapt-learn-graph-frontend:expert-order-check ./frontend` | Node22 TypeScript/Vite8.3.0 build2507 modules succeeds; bundle-size notice retained | Initial TS1294 parameter-property syntax was corrected to explicit fields for existing erasableSyntaxOnly; final build used corrected source. No executable test |
| `npx.cmd --no-install oxlint` on detail/API/en/vi files | Exit0/no diagnostics | Four affected frontend files only |
| Git/source checks | Changed diff clean; original index treeafe072a0a4d18e07fb8fe7b574e47ad484a17e8b exact, HEAD/MERGE_HEAD unchanged, no unmerged paths, old migration/production-Compose/shared-CSRF deltas0 | Existing unrelated staged/unstaged/untracked work retained, no stage/commit/push |

Bounded C2 manual HTTP through8088, approximately15:02–15:07+07; real `expert@workspace.dev.invalid`, fixed development organization, live assignment, current SE draft `cf0fcb00-44fe-47d0-87a9-242c51d46c26`, Software Engineer/Middle. No executable test file/method, runner, mock or outcome seed was created/run. Baseline completion/gap/generation inputs already belonged to the user's real flow. No confirmation/approval was sent.

| Acceptance / manual trigger | Observed result |
|---|---|
| R03/R14: move FS03-LOW-ALT up over READ-CORE01 at revision4 |422 PREREQUISITE_ORDER_VIOLATION; diagnostic `PREREQUISITE_ORDER:MOD-READ-CORE01:MOD-FOCUS-FS03-LOW-ALT:MS-CORE01`; revision4/hash `b1489689fa434fb051ac348742e927fd9137515f8f7639a0fcd58d99b8ff0d51` unchanged, no history row |
| R03/R09: independent FS07-LOW-ALT up over FS04-LOW |200/revision5, displayed order starts FS07 then FS04; GET validation VALID with matching hash `9948c09d2df0c46b1e8cc019b040747e19c8994fa27172cc88284b6df041f7fc` |
| R10: exact same move body/key replay |200/revision5 again, no duplicate revision; inverse DOWN creates revision6/VALID and restores original order |
| R03/R14: REMOVE READ-CORE01 from Included |200/revision7, not selected, latest override REMOVE, eligible Catalog candidate present; Check UNRESOLVED with MISSING_PROVIDER:MS-CORE01 and UNPLANNED_PREREQUISITE:MS-CORE01 |
| R03/R14: Include provider again |200/revision8/VALID; provider inserted before dependent modules |
| R03/R06: Exclude provider, then trash/REMOVE from Excluded |EXCLUDE revision9/UNRESOLVED; REMOVE revision10 leaves neutral membership rather than EXCLUDE; Catalog return does not erase old overrides |
| R03/R14: Include and final read/Check |Revision11,15 selected modules in exact original15-module order, VALID/empty diagnostics and matching hash `47748de33d076e5d19edac49cd518d1d7bfa49097765d611e6c35b848998fa23`, still AWAITING_EXPERT_REVIEW |
| R14: repeat forbidden FS03 inversion at revision11 |422 with exact structured provider/dependent/skill diagnostic; no further revision; all verification sessions signed out204 |

The7 successful edit revisions/overrides/receipts intentionally remain as real development review history (4→5 MOVE_UP→6 MOVE_DOWN→7 REMOVE→8 INCLUDE→9 EXCLUDE→10 REMOVE→11 INCLUDE). They were not deleted to simulate a clean run. Baseline3 attempts/165 responses/2 results/55 evidence/2 profiles, role selections3, gap snapshots3, requests3, old approvals2 and both active baselines remain unchanged. After excluding only the newly appended SE revisions/module/dependency/override/receipt rows and its intentionally advanced current pointer, all16 original table/row-set aggregates match the before snapshot, including all77 original revisions/695 module rows/35 dependencies/74 overrides/79 receipts. No Employee outcome/selection/Security/approved-content mutation was performed. Rollback must retain readers/V35/new history and disable new mutations; do not narrow CHECK or rewrite old records to hide the operations.

Remaining: browser inventory apps/browsers empty. Real arrow/trash click, popup rendering/focus/keyboard/mobile/EN-VI/drag gestures are not agent-observed; build and HTTP are not browser acceptance. New-order exact final approval/Employee projection, negative stale/foreign/revoked/approved/legacy cases, evidence-ready/internal-gate variants, concurrent CAS/outages and executable C3 remain planned/not run. No production readiness or cluster transition is claimed.

## User-selected SE rewind to100 real responses — 2026-10-29

Authority: after requesting a way to retry the UI following a genuine120-answer completion, the user explicitly selected option2: retain100 already-answered questions and continue from101. This is a one-time shared-development maintenance exception to normal immutable history, scoped to this exact SE attempt. It does not add an application reset route, change migrations/production gates, or seed fabricated outcomes. No executable tests were created/run.

Verified ownership: org `00000000-0000-0000-0000-000000000001`, learner `01f1fb56-c545-3454-8c3e-68401f6ba3ef`, real account `employee@workspace.dev.invalid`, attempt `8027e869-1cb0-4c2a-af2f-296f96a73239`, occupation `OCC-15-1252.00`. This is the same Employee that owns the earlier Security assessment; Security is outside the operation. Pre-state AUTO_SUBMITTED/revision121/120 responses/40 mastery evidence/one profile. There is no gap/pathway/processing-job dependency, successor attempt or delivered mastery event.

Stopped API/embedded worker before backup. `pg_dump -Fc` completed and the archive was copied out of the container to ignored workspace `.tools/db-backups/20261029-se-answer100/before.dump`:2804089 bytes,SHA256 `c05e734e72e00c5073fecc74eea5cc78e6c81b3af3e633649dc3483ad289aa59`. `pg_restore -l` read1038 TOC entries; a full restore was not exercised. The one-time SQL is retained beside that backup, not imported by Docker startup or tracked in product source.

The final maintenance transaction locks the relevant tables, checks exact actor/attempt/state/counts/dependencies/deadline, then restores the real ANSWER receipt at revision101:100 responses/101 presented items/40 actual provisional skill states. It removes only this attempt's later20 responses/19 presentations/20 receipts, completion result,40 skill results,40 evidence rows, SE profile and its one undelivered completion outbox event. It keeps original times/pins/pool and correct/incorrect values; no answers or scores are generated. Exact history guards were temporarily disabled only for the targeted maintenance and re-enabled before commit; foreign keys/checks/deferred aggregate validators remained enabled. `SET CONSTRAINTS ALL IMMEDIATE` succeeded before commit. Initial SQL/identity guard issues and one preservation-query alias error rolled back completely; no partial state/disabled guard was committed by those failures.

Final COMMIT at approximately14:20+07: IN_PROGRESS/revision101/answered100/currentQuestion101. All124 other platform-table scoped count/content digests matched; first100 responses, first101 presentations/receipts, all360 pool items and original108 audit rows were verified unchanged. One explicit `BASELINE_REWOUND_FOR_UI_CHECK` development-maintenance audit was appended with actual database time, null actor rather than an invented application reviewer. Deadline remains `2026-10-29T08:31:01.326432Z` =15:31:01+07; no extension. Earlier complete results are retained in the backup/audit; the live SE profile is intentionally absent until genuine completion again.

Post-restart: existing Compose start reran readiness/migrate/seed dependencies successfully and API is healthy/web running. Readback shows0 disabled platform triggers and0 SE result/evidence/profile rows. A separate real Employee session GET through8088 returned200: IN_PROGRESS/revision101/answeredCount100/presentedCount101/only unansweredPosition101/expired:false; signed out204. No answer/submit was sent on the user's behalf. Browser/UI interaction and C3 acceptance remain Not run. `git diff --check` receipt clean, original index compares exact; HEAD/MERGE_HEAD, source/migrations/catalog/production config unchanged by this operation; no stage/commit/push.

## Baseline quiz scroll and action stability — 2026-10-29

Final correction verification: Docker Node22 `docker build --target build -t adapt-learn-graph-frontend:baseline-ui-check ./frontend` exits0, TypeScript/Vite8.3.0 build2507 modules; retained bundle-size notice. Scoped oxlint exits0/no diagnostics, changed diff clean, index/HEAD/MERGE_HEAD unchanged. This is build/static evidence only; no executable tests or browser interaction was run.

Subsequent user-approved correction: the screenshot showed the constrained question body clipping options behind an inner scrollbar. User explicitly approved natural question-card height to show the full prompt/all4 choices, with Previous/Save below and normal page scrolling. The correction removes only the question card's viewport/minimum height/flex layout and body flex-fill/overflow containment classes in BaselineAttemptPanel.tsx. Navigation scrollbar hiding/contained current-question scroll, panel state retention and removal of the in-progress LoadingCard remain. This supersedes only the fixed-height/inner-scroll description and UI04 expectation below; action position now follows content height as accepted. Scoped oxlint exits0; final Docker build is recorded after completion. Manual UI04 expectation is now: all4 choices visible in the expanded card without inner scrolling or clipping, long content remains reachable through normal page scroll, saved answers remain read-only. No new screenshot/browser/executable-test pass, API/backend/CSRF/data change or service restart is claimed.

Authority: user confirmed UI group1, then explicitly requested implementing only group1 and dropping performance group2. Scope REQ-002-F01 Employee baseline presentation: `BaselineAttemptPanel.tsx` and `EmployeeBaselinePage.tsx` only. No shared fetch/CSRF change, batch-content adapter, API/backend/scoring/planner/data change or latency claim.

Source findings: an in-progress command inserted a full LoadingCard above the retained attempt, shifting the page on busy transitions. The panel key included revision, remounting the navigation after every accepted answer and losing list scroll. Actions were below variable-height question content. The correction keeps the panel keyed by attempt ID, derives current question/unsaved choice from revision, and adjusts only the navigation element's scrollTop when the current question is outside its visible bounds. It does not use scrollIntoView on the page. Navigation scrollbar is hidden locally; overflow scrolling, focus rings and scroll containment remain. The question card uses a viewport-based fixed height with a minimum, scrollable question body and separate action footer. Initial/terminal loading remains; active writes show busy feedback on the save button. Existing own-attempt/revision/idempotency/unknown-outcome retry/deadline/committed-readonly rules remain in the unchanged hook/API/backend.

| Check / command | Observed outcome | Boundary |
|---|---|---|
| Native `npm.cmd run build` | Blocked by TS5033/EPERM writing node_modules/.tmp tsbuildinfo | No source type error reported before the filesystem failure; not a successful build |
| `npx.cmd --no-install oxlint src/features/employee/baseline-assessment/BaselineAttemptPanel.tsx src/features/employee/baseline-assessment/EmployeeBaselinePage.tsx` | Exit0, no diagnostics | Scoped static lint only |
| `docker compose exec -T web npm run build` | Could not run: service web is not running | User's stopped stack was retained, no restart/data mutation |
| `docker build --target build -t adapt-learn-graph-frontend:baseline-ui-check ./frontend` | Docker Node22 TypeScript/Vite8 build succeeds,2507 modules; retained large-bundle notice | Separate build image, not deployment or browser acceptance; no executable tests |
| Browser inventory | apps/browsers empty | No connected-browser visual/interaction evidence |

Manual acceptance remains Not run, not C3 Passed. Use the existing real Employee session/owned IN_PROGRESS attempt at `http://127.0.0.1:8088/employee/baseline-assessment/<attemptId>` after the user starts the existing stack. Do not reset attempts or submit answers on the user's behalf. Each row below is a procedure/expected result, not executed evidence; no test file/method was added or run.

| Acceptance | Actor/fixture/trigger | Expected observation |
|---|---|---|
| UI01 stable submit | Authorized Employee, own attempt, scroll to Save and submit chosen answer | Busy indicator stays in action bar; no extra card/page displacement; after server confirmation the new question appears, its unsaved choice is empty and action footer remains in place |
| UI02 current navigation | Own attempt with enough questions to overflow navigation, answer a later question | Current question stays visible within navigation; list does not reset to question1; page scroll is not changed by the navigation effect |
| UI03 hidden scrollbar/containment | Same attempt, wheel/touchpad and Tab through navigation; reach either list boundary | No navigation scrollbar; list remains scrollable/focus-visible and does not chain wheel scrolling to the page at its boundary |
| UI04 long content/responsive/review | Same attempt, long prompt/options; desktop/mobile and EN/VI; Previous/Next on saved answers | Content scrolls within question body, actions remain separate/reachable, no horizontal clipping; saved answers remain read-only; no answer write from review |
| UI05 failure/expiry/completion | Existing manual/C3-owned fixtures for ambiguous failure/retry, expiry and terminal result | Controls retain lock/retry semantics; unsent choice never counts as saved; no automatic next before a confirmed response; server expiry/finalization authoritative; initial/terminal loading retained |

Original index/HEAD/MERGE_HEAD and pre-existing local work are retained. No stage/commit/push, stack restart, executable-test creation/execution, learner answer or volume change in this slice. Required browser/Playwright evidence remains open; C3 needs separate explicit approval under workspace rules.

## SE activation input and Occupation display fix — 2026-10-29

Authority: user explicitly approved correcting the reported Occupation-name and SE activation-input defects, then requested continuation. Scope: REQ-002-F02 L&D listing/technical inputs and REQ-002-F01 admission dependency; C2 build/manual smoke only. No executable test file/method or test runner was created/run. No automatic Finalize/Activate, learner outcome, schema/migration/catalog-version change, frontend/planner change, or production-gate relaxation.

Root cause: the initial SE seed/exact development adapter accepted SEEDED/CANDIDATE, while unchanged V23 `guard_baseline_version_namespace` requires PROMOTED for every new adaptive Blueprint version. PostgreSQL rejected Finalize at11:56:13.797 and11:59:37.829+07, rolling back the version and activation. Separately, draft listing fell back to occupation_id when no released version existed. The reported successful UI toast was not browser/network reproduced; this change does not claim to fix a proven toast defect. One Active version per `(organization_id,occupation_id)` was already correctly enforced; Security Active does not block SE.

Implementation: workspace listing opts into a same-organization active resource/occupation/department name lookup; released names remain immutable snapshots and default legacy constructors retain their old query without workspace-table dependencies. The SE seed validates all360 exact synthetic parameters and transitions BUILDING→CANDIDATE→PROMOTED with the existing real development L&D actor and actual database timestamp. The exact development adapter requires that status/actor/timestamp plus original tuple/hash/configuration/provenance. Source remains SEEDED, diagnostics `operationalPromotionEligible:false`, model approval null; no calibration/ACTUAL_PILOT approval is fabricated. Operational effective lookup still requires CALIBRATED/approved actual-pilot input and rejects SEEDED. Reruns preserve the fixture promotion timestamp.

| Observation / command | Actor / fixture / actual outcome | Limits |
|---|---|---|
| `docker compose config --quiet`; `docker compose build api` | Config valid; Java21.0.12.1/Maven3.9.11 package427 sources BUILD SUCCESS at12:27:21+07, image config `sha256:5737885f9f890fad1c2b5299ec9528c61241b0eef742fac928ef26e1cd5b9b77` | `-Dmaven.test.skip=true`: all test resources/compile/execution skipped |
| `docker compose up -d` | Normal startup completed12:29+07; all seed/migrate/readiness jobs exit0, API/PostgreSQL/Neo4j healthy, existing web serves8088 | No reset/unseal/maintenance override |
| Read-only parameter/model query | SE set `c4ab5b11-9504-3cd5-978b-1e5adb022966`: SEEDED/PROMOTED, actor `d797db9b-c2f2-3f5b-98c5-ae20197f8b0c`, activated_at `2026-10-29T05:29:35.774459Z`; model approval null | Technical fixture activation is distinct from Blueprint activation |
| Real L&D sign-in; GET `/api/v1/ld/adaptive-baseline-blueprints` | Manual HTTP13:21–13:22+07, fixed org `00000000-0000-0000-0000-000000000001`, real LD_MANAGER:200; DEMO DRAFT occupationName **Software Developers**; Security version1 remains ACTIVE | Browser interaction/visual state Not run |
| GET `/api/v1/ld/adaptive-baseline-blueprints/occupations/OCC-15-1252.00`; POST same path `/test` with saved revision3 |200; capacity360/40/min120/missing0; Preview200 feasible:true,120 sample items,0 shortages; sign-out204 | Manual preview only; sample answers/keys not logged. SE still NO_ACTIVE; no Finalize/Activate or Employee attempt sent |
| `docker compose run --rm --no-deps se-seed` at13:22–13:23+07 | Exit0; exact original promotion timestamp preserved; draft revision3/working rows and command hashes unchanged | No crash/concurrent/drift executable verification |
| Neo4j read-only query | Setting default_to_read_only=true; neo4j read-only/online,994 nodes/5124 edges | No catalog write; earlier3-edge maintenance receipt remains separate |

Before deployment versus after startup, all14 count/content aggregates below match. Shape: `SELECT count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),'')) FROM platform.<table> t`. User's current DEMO working ID `490ca554-1d04-48bb-b890-4d71eb534dfd`, revision3 OPEN, maxQuestions120/timeLimitSeconds7200 remains intact. Role selections had legitimately increased to3 before this deployment; no attempt to restore the earlier2-row snapshot. Manual Preview and repeated seed also leave working/command aggregates unchanged. This is bounded preservation evidence, not executable regression coverage.

| Table | Count | Unchanged MD5 aggregate |
|---|---:|---|
| baseline_adaptive_attempt |2|ea0f65349423e4026f68748a2019d357|
| baseline_attempt_response |45|fc0ee6adc31615c505195fc7d6b7dbae|
| baseline_attempt_result |1|988e35f6e1cf73617c4e442c8f5f4806|
| baseline_mastery_evidence |15|69a9ffa8180a3f69a4d3e7ff98ec7cbb|
| employee_occupation_profile |1|95781268632e99b187beaec4ec290e82|
| employee_role_selection |3|378db5aeb8fc5521464939c244f9b6a5|
| initial_pathway_request |2|7a6c3a2f030096a1280f4424062b975b|
| initial_pathway_revision |73|310a3cdab177dfd448b074dbed89ebf7|
| initial_pathway_approval |2|aceeb9a3cde92162004c95c9c19a6dec|
| baseline_adaptive_blueprint_working_revision |2|aebb7b2fe7172b294252a851c7166c48|
| baseline_adaptive_blueprint_version |1|531bb9c02b4baf5bcd1b8d7359e7c747|
| baseline_blueprint_activation |1|9da21d86a3305790660c8ca067ce2f3d|
| baseline_blueprint_activation_event |1|b7d0838f1d3b2cbe32b682e8d55f52df|
| baseline_blueprint_command |5|7ee0673bf43d98d2caec7598a2a784c8|

Final readback after Preview and repeated seed again matched all14 aggregates above. Working-tree `git diff --check` clean; original index tree `afe072a0a4d18e07fb8fe7b574e47ad484a17e8b` compares exact, HEAD/MERGE_HEAD unchanged, no unmerged paths and no migration/production-Compose delta. Existing local work is retained; no stage/commit/push.

Remaining acceptance: user Refresh→Preview→Activate to observe the actual SE version commit, then genuine Employee assessment→mastery→gap→generation→Expert review→Employee view. No post-fix activation commit, browser success/error feedback, two-Occupation simultaneous-activation runtime check, numerical calibration/search, cross-tenant/concurrent/drift/production regression or C3 pass is claimed.

## SE shared seed — 2026-10-29, 11:03–11:20 Asia/Bangkok

The initial limits in this section are dated. The user subsequently explicitly approved applying the three data edges through stop/backup/controlled-write/reseal; the follow-up immediately below supersedes its pending-edge status.

### Approved prerequisite data application — 2026-10-29, 11:36 onward Asia/Bangkok

Authority: after confirming these are data rows using existing HAS_SKILL_PREREQUISITE/MicroSkill schema, the user said “Ok vậy thêm phần đó đi” in response to the concrete stop API/worker → backup → temporary write → exact3-edge import → verify → reseal procedure. This resolves the earlier approval block for this bounded development operation, not automatic unsealing of arbitrary catalogs. No source/runtime algorithm/schema/version change, executable tests or learner outcomes are part of this operation.

- Stopped API (including its embedded worker) and Neo4j gracefully. PostgreSQL and existing volumes remained in place. Captured fresh count/content aggregates for the same9 history tables; current counts remained2 attempts/45 responses/1 result/15 evidence/1 profile/2 selections/2 requests/73 revisions/2 approvals.
- `docker cp ...:/catalog-state .../catalog-state` preserved marker state. With graph stopped, `docker compose run --rm --no-deps --entrypoint neo4j-admin -v <backup>:/backups neo4j database dump neo4j --to-path=/backups` exited0. Backup: workspace `.tools/catalog-backups/20261029-113627-se-prerequisites/neo4j.dump`,724593 bytes,SHA256 `b18e3d770e87635fed7c87f71b24ec8dd88b6071026b6bf1b30716e477d2266c`. Dump success/hash are observed; restore was not exercised.
- An ignored one-time maintenance Compose override restarted the SAME Neo4j service/data volume using its standard entrypoint with `server.databases.default_to_read_only=false`, while API/worker remained stopped. This override is not part of default startup. No volume deletion, reset, new persistent graph or artifact repin.
- A bounded importer verified both source byte hashes, read all nodes/edges in a Neo4j transaction, required exact original or exact supplemented parity, then MERGEd only the3 approved skill edges with ON CREATE properties. A complete in-transaction readback required unchanged original nodes/edges and exactly5124 final edges before commit; any mismatch would roll back. Observed committed:true,created:3,nodes:994,edges:5124,allOriginalNodesAndEdgesUnchanged:true. RequiredScore0.75 and NEEDS_EXPERT_REVIEW remain; no reviewer/PASS fabricated.
- Added `MS-FS03 → MS-CORE01`, `MS-FS05 → MS-FS04`, `MS-FS16 → MS-FS05` (stored dependent→prerequisite). All use existing node IDs/type/version0.11.0. No Module→Module catalog relation.
- Stopped the maintenance instance and restarted using DEFAULT Compose/unchanged start-catalog.sh. Readback: `server.databases.default_to_read_only=true`, database read-only/online, all3 new edges present at0.75. Then ran normal `docker compose up -d` to rerun exact seeds and start API/worker. Final startup and HTTP status are recorded below when observed.
- After commit/reseal, the fresh9-table count/content aggregate snapshot exactly matched the before-operation snapshot. The actual evidence-high/complete genuine SE assessment→approval/browser journeys and all executable tests remain Not run.
- Final11:45–11:46+07: default `docker compose up -d` exited0, migrate/seed/workspace-seed/se-seed/catalog-ready/workspace-keys exited0; API/PostgreSQL/Neo4j healthy and web serving8088. No maintenance override remains active. Real L&D login200→SE workspace GET200 capacity360/40/min120/0 missing/NO_ACTIVE. Existing Security Employee login200→own current pathway200 APPROVED/VALID revision70,hash `5edb904c2eb242786113147c443b5eb667b4a8f1fabad15a5565d5571b675365`,9 modules retained. Both sessions signed out204. `git diff --check` working changes clean; original523-path index still exactly afe072a0a4d18e07fb8fe7b574e47ad484a17e8b, HEAD/MERGE_HEAD unchanged. No executable tests, stage, commit or push. This follow-up changed data and affected explanatory/evidence/memory files only, not product runtime source.

Authority: user explicitly approved adding two shared SE seed files and integrating the existing Docker startup, without a new catalog version. User clarified local seed discussion is not Cluster1 final-product documentation. Scope: REQ-002-F02/F01/009 inputs; existing REQ-041-F02/042-F01/019/020/004 integration is reused. No executable test was created/run, and no learner outcome was seeded. No UI/planner/schema/migration/production-Compose changes.

| Input | Exact source/provenance |
|---|---|
| Module/prerequisite input | `backend/src/main/resources/db/seed/se-modules.json`, SHA256 `3ece80a4a63043b5044ad46f82e9503da12bf9fa1a8eaeee3378034817bb1a1a`; reuses7 Module snapshots/19 TEACHES, proposes3 skill edges, retains catalog0.11.0/base hash |
| Question bank | `backend/src/main/resources/db/seed/question-bank-se.json`, SHA256 `8922129d2d67ec8ec9736ae1aa560e2af992fe82633464aebeea6c09ad034552`;360 locally authored DRAFT decision questions,40 existing union skills,9 items/skill (3 EASY/3 MEDIUM/3 HARD); labels/content remain unreviewed, not psychometric validation |
| Exact SE resources | bank `4ad4254f-2a39-3738-8c04-f196b07f550b`; model `7da02cd4-f73d-36c7-b91b-4f36a5e7549e`; mapping `80e1ead2-04e9-3fc5-8c18-6048be445244`; parameter set `c4ab5b11-9504-3cd5-978b-1e5adb022966`; fixed development org retained |
| Technical provenance | Declared synthetic a1.5 / b-1,0,1 / c0.25; existing reference MAP/3PL policy and conservative mapping k1. SEEDED/CANDIDATE assembled through BUILDING in one transaction, activation/reviewer null; no calibration result/promotion fabricated |

Automatic approval review rejected the attempted startup edit that restarted an existing sealed graph writable and applied Cypher directly, citing conflict with the seal restriction and risk of irreversible catalog mutation. The edit did not apply. Both catalog lifecycle scripts remain byte-exact relative to the starting index. The safer implemented path only adds edges in the existing EMPTY-graph initial import before seal; on this existing sealed base it verifies and retains the exact graph. Three new edges (FS03→CORE01, FS05→FS04, FS16→FS05) remain absent/pending a separately approved catalog update. No workaround, unseal, volume reset, Flyway repair, artifact repin or historical row update was performed.

| Observation / command | Actor / trigger / actual outcome | Limits |
|---|---|---|
| `docker compose config --quiet` | Existing Compose + se-seed dependency config valid | Static configuration only |
| `docker compose build api` | Final build Java21.0.12.1/Maven3.9.11,427 sources, BUILD SUCCESS at11:12:54+07; image config `sha256:cbdda2d89e393a76545670d2d8251671bf0fcf3233f1c87f97977cbfbf43c3d6`. Dockerfile uses `-Dmaven.test.skip=true`; no test resources/compilation/execution | Native corrected Maven command was blocked by target-resource filesystem write permission; Docker is the build evidence |
| Initial normal up | Bank import succeeded; SE fixture transaction failed the existing BUILDING-before-CANDIDATE trigger and rolled back | Source corrected to assemble then seal once; no trigger/schema change |
| Corrected `docker compose up -d` | migrate/seed/workspace-seed/catalog-ready/workspace-keys/se-seed exited0; API/PG/Neo4j healthy, web serving8088 | Existing graph retained; no new prerequisite edges applied |
| Repeated normal `docker compose up -d` | Exit0; seed rerun verifies existing bank/immutable parameter rows without extending them; API remains healthy | No concurrent/crash/drift test performed |
| PostgreSQL read-only inventory | Security135 DRAFT/15 skills retained; SE360 DRAFT/40 skills; total495 items,2 resource bindings,360 SE parameter rows. Original SEEDED/PROMOTED Security set retained; new SE set is SEEDED/CANDIDATE | This is input provisioning, not learner evidence |
| L&D real session + GET `/api/v1/ld/baseline-blueprint-catalog/occupations` | HTTP200, Security and Software Developers visible | Correct fixed org and LD_MANAGER membership, no actor/tenant client selector |
| L&D GET `/api/v1/ld/adaptive-baseline-blueprints/occupations/OCC-15-1252.00` | HTTP200; occupation capacity360,40 skills, minimumPerSkill3/minimumQuestions120, modelMaxQuestions4096, missing parameter count0; working/current null, admission NO_ACTIVE | No Blueprint saved/previewed/activated. Full L&D→Employee→mastery SE journey Not run |
| New real Employee SE sign-in + GET `/api/v1/employee/target-roles` | HTTP200;18 total authorized Roles,10 SE Roles. Both manual sessions signed out204 | No Role selection, attempt or outcome created; browser/UI interaction Not run |
| Neo4j read-only inventory |994 nodes/5121 edges,0 REL-SE additions,online/read-only; Neo4j remained running throughout these startups | Fresh EMPTY-graph supplemented import Not run |

Before startup and after corrected startup/repeated up, row counts and MD5 content aggregates matched for all nine existing learner/pathway tables. The read-only SQL shape was `SELECT count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),'')) FROM platform.<table> t`; only digests/counts were emitted, no protected answers. It is a bounded preservation observation, not a regression suite.

| Table | Count | Unchanged MD5 aggregate |
|---|---:|---|
| baseline_adaptive_attempt |2|ea0f65349423e4026f68748a2019d357|
| baseline_attempt_response |45|fc0ee6adc31615c505195fc7d6b7dbae|
| baseline_attempt_result |1|988e35f6e1cf73617c4e442c8f5f4806|
| baseline_mastery_evidence |15|69a9ffa8180a3f69a4d3e7ff98ec7cbb|
| employee_occupation_profile |1|95781268632e99b187beaec4ec290e82|
| employee_role_selection |2|712e2eb950d36820c2ed99f940c53398|
| initial_pathway_request |2|7a6c3a2f030096a1280f4424062b975b|
| initial_pathway_revision |73|310a3cdab177dfd448b074dbed89ebf7|
| initial_pathway_approval |2|aceeb9a3cde92162004c95c9c19a6dec|

No SE baseline_blueprint row exists after these reads; only the original Security Blueprint remains. Source/index preservation: HEAD b2ed102a41b2101c4f2bc9a1c2afae80bab8525d and MERGE_HEAD9b76905c4a2560300efb44ef4d1bc44b559e85ab unchanged; index compares byte-exact to starting tree afe072a0a4d18e07fb8fe7b574e47ad484a17e8b. New work is unstaged/untracked, no stage/commit/push. `git diff --check` for working changes clean. Original SQL and pinned catalog/Security-bank artifacts are untouched.

Remaining: permission/process for applying3 edges to the existing sealed graph; fresh bootstrap/runtime proof, full genuine SE baseline/mastery/generation/review journey, numerical evidence-high feasibility, search budget, two-tenant/drift/outage/concurrency/production-boundary checks, browser/mobile/EN-VI. All executable C3 remains Not run and requires separate approval. Learning execution/content access remains unavailable.

## Original source checkpoint

Fetch origin succeeded; main remained `9b76905`. The actual merge initially reported the same 26 content/modify-delete conflict paths as the Phase A preview. Resolve UI hunks by preserving real-auth workspace shell/guards plus the confirmed adaptive Role/Level/gap/review/approved-view behavior. Keep both language domains. The real login page replaces the retired preset login: LoginPage.test.tsx is byte-exact incoming main source; old preset tests are retained in the ignored pre-merge backup, not rewritten into new assertions or executed.

The main domain/FR document structure is retained. Detailed confirmed Function contracts moved to `documents/technical/initial-pathway/` and baseline technical documents; affected links were repaired. Domain descriptions now distinguish API-backed initial slices from remaining prototypes. Historical test results retain their original source/environment scope.

The original 28 migration scripts remain byte-identical to HEAD. The separate workspace location has 32 byte-identical main scripts plus additive V33/V34 copied from the retained initial-pathway SQL. Development Compose explicitly selects that location and new data/security volumes; no database was migrated or reset. Production routing/cutover remains outside this task and was not changed. The byte-pinned synthetic parameter JSON now has an explicit LF attribute; its unchanged working/Git SHA256 is `089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e`.

Final source review also replaced account.identifier (email in main) with the scoped workspace display name for Expert learner labels, falling back to learner ID. This preserves the protected-contact-data boundary without changing approval/revision hashes or learner state.

Backup: workspace ignored `.tools/audit-auth/20261028-phase-b/before-merge.bundle`, pre-merge refs/status/index, and conflicted index/stages. No reset/clean/abort/commit/merge commit/push or current-runtime changes.

## Actual checks

| Check | Command/environment | Actual result |
| --- | --- | --- |
| BE package | `backend/mvnw.cmd -B -ntp "-Dmaven.test.skip=true" package`; Java21.0.12, Maven3.9.11 | BUILD SUCCESS, 424 sources, final run 23:55:39+07. Explicit logs: Not copying test resources; Not compiling test sources; Tests are skipped. Deprecated API notice retained. |
| Final JAR | `backend/target/adapt-learn-graph.jar` | SHA256 `af84c4d5c654bdafe2a455787e1967fedf5fef65f1bcd3079f113169e735bbbc`, after the learner-label correction. Not deployed. |
| FE dependencies | `npm.cmd ci --no-audit --no-fund`; Node24.19.0 | Exit0, 191 packages. No package/lockfile version edits beyond incoming main. |
| FE type/build | `npm.cmd run build` | Exit0; TypeScript and Vite8.3.0, 2505 modules. Existing large-chunk warning retained. This native Node24 build is not a Docker Node22 build result. |
| Scoped FE lint | `npm.cmd run lint --` App.tsx, initialPathway.ts, useInitialPathwaySession.ts, WorkspaceBoundary.tsx, WorkspaceLayout.tsx, CurrentRolePanel.tsx, CurrentRoleSummary.tsx, currentRoleFlowApi.ts, en.ts, vi.ts | Exit0, no errors; one retained WorkspaceLayout set-state-in-effect warning at sidebar effect. |
| Compose syntax | `docker compose -f compose.dev.yml config --quiet` | Exit0; no services started and no resolved secret values printed. |
| SQL/source compatibility | Byte comparison of original 28 paths against HEAD and main 32 scripts against incoming source; inspect active workspace version set | Original scripts unchanged; 34 distinct workspace versions. No SQL execution. |
| Protected fixture wiring | Static source review of mutually exclusive profiles, Actors/CSRF, membership/entitlement, exact org/bank/catalog gates and temporary assignment | Real workspace principal only in workspace composition; persona bypass disabled in dev Compose; exact development fixture gates; production/mixed profiles cannot activate workspace pathway adapters. Static inspection is not executable security evidence. |

Git conflict index has no unmerged entries. Working diff check and scoped staged runtime/configuration checks are clean. The full staged `git diff --cached --check` reports 164 Markdown whitespace findings in preserved incoming/historical document formatting (including Markdown hard breaks); no non-Markdown source finding. These were inspected and retained rather than bulk-reformatting the imported SRS/evidence to hide the warning.

Earlier attempts remain failures: an unquoted PowerShell Maven property was parsed as an invalid lifecycle phase; npm.ps1 was blocked by Windows execution policy and npm.cmd was used without changing policy; the first Java compile found ambiguous wildcard imports and the first FE type-check found stale menu persona identifiers. These were corrected before the final successful builds. No tests ran in any attempt.

Automatic review rejected broad initial migration/activation edits and a production Compose routing change. The implemented safer approach preserves applied scripts, uses mutually exclusive real/demo composition, and limits new migration routing to development/workspace configuration. Production Compose is unchanged and requires a separate deployment/migration review.

## Runtime/manual mapping — Not run

Read [DEV-DEMO](../../../DEV-DEMO.md) for actual fixture credentials, startup order, routes and limitations. No new API/session/seed/DB/browser/Compose journey was executed in this task. In particular, fresh-container seed SQL, Flyway application, graph sealing, key-file loading, sign-in, genuine baseline finalization, worker/review/approval and responsive UI are **Not run** after this merge. Historical demo success and incoming member receipts do not establish these results.

| Function / acceptance | Actor/tenant/fixture and trigger | Expected outcome after separately authorized manual startup |
| --- | --- | --- |
| REQ-002-F02; baseline RB/VB | Development L&D, fixed development org, exact v011/security bank; Save/Preview/Activate | Genuine persisted full-Occupation Blueprint; no seed activation or fabricated publication. |
| REQ-002-F01 / REQ-009 | Same-org Employee; selected Role/Level, real answer/submit/deadline/reload | Persisted own original mastery/result; immutable pins, replay, minimum-evidence/one-baseline rules; no seeded outcome or low-score retake. |
| REQ-041-F02; G01–G13 | Employee; exact Role+Level preview, foreign/wrong-role and missing input variants | Exact 0..1 gap/UNKNOWN from original profile; no-state-change reads; trusted tenant and no protected data leak. |
| REQ-001-F02 / REQ-042-F01; P01–P20 | Employee explicitly confirms preview/key, worker processes scoped request | Durable receipt/CAS/frozen input/claim fencing; bounded proven initial plan or explicit unavailable/unresolved/search-limit. |
| REQ-019-F01 / REQ-020-F01/F02; R01–R14 | Fixed development Expert with live membership; include/exclude/restore/validate/exact approve and stale/replay/foreign variants | Assigned/bounded queue, persisted exact revisions/approval/history; no unconditional approval, no hidden regeneration. |
| REQ-004-F01; E01–E09 view scope | Same Employee reads current/archive; other role/tenant, unavailable content, EN/VI/desktop/mobile | Exact own approved order/context/frozen baseline counts; original roadmap/timeline/dialogs; no writes/fake completion/readiness/learning entry. |
| Auth/cache/fixture boundaries | Logout/account switch/expiry, forged headers/org, missing CSRF, polling through pending command; wrong/mixed/prod flags | Server denies unauthorized requests, clears prior identity's queries/forms/retry state, keeps form stable across same-identity polls; fixture cannot grant production/billing rights or another tenant's data. |

All executable methods/files/commands and optimizer/hash/race/legacy/tenant/performance assertions remain existing planned C3 scope; none were authored or run here. C4/C5 and production readiness are not claimed. The learning content/start/segment engine and later mastery recalculation remain outside this view-only milestone.

## C2 runtime follow-up — 2026-10-29

Authority: user explicitly requested “Tiến hành chạy Compose và kiểm tra C2, giữ dữ liệu cũ.” Observations below were made approximately 08:15–08:26 Asia/Bangkok on the shared development stack, using manual HTTP requests through `http://127.0.0.1:8088`, real password login, JDBC sessions, fresh PostgreSQL workspace volumes and the exact v011 catalog. No executable test file, runner or assertions were created/run. This is bounded C2 manual evidence, not completion of the G/P/R/E C3 matrix.

Two integration defects were reproduced and fixed:

- Initial API startup failed with `BeanDefinitionOverrideException`: the configuration class and its filter-chain factory were both named `workspaceInitialPathwaySecurity`. Rename only the factory to `workspaceInitialPathwayFilterChain`; preserve filter ordering, real Actors and CSRF. Bean overriding remains disabled.
- After that fix, API started but aggregate health was DOWN because the unused mail indicator tried unconfigured SMTP. Set `MANAGEMENT_HEALTH_MAIL_ENABLED=false` only in development Compose, alongside the already disabled mail worker. PostgreSQL/Neo4j health remains active; production configuration is unchanged.

| Function / acceptance | Actor, fixture, trigger / command | Observed result |
| --- | --- | --- |
| Startup and preservation | `docker compose up --build -d`, then `docker compose up -d`; fixed development org `00000000-0000-0000-0000-000000000001` | After fixes, API/PostgreSQL/Neo4j healthy, web serving; migrate, seed, workspace-seed, workspace-keys and catalog-ready exit0. Flyway applied V1–V34. Catalog-ready reports sealed read-only. Old volume inventory comparison: zero missing; new DB/graph mounts use workspace volumes, with no reset/repair/down -v. |
| Build | `docker compose build api`; Docker Java21.0.12.1 / Maven3.9.11 | BUILD SUCCESS at08:19:59+07,424 sources; test resources, test compile and test execution explicitly skipped. |
| FE type/build | `docker compose exec -T web npm run build`; Node22.23.4 / Vite8.3.0 | Exit0,2505 modules. Existing large-chunk warning retained. Initial npm ci reported6 dependency advisories (2 moderate/4 high); no dependency upgrade attempted. |
| Fixture safety/idempotence | `docker compose run --rm --no-deps workspace-seed`, repeated normal Compose startup | Exit0 without overwriting credentials/roles or duplicating outcomes. Before manual journey:0 attempts/profiles/requests/approvals. After journey and seed reruns:2 attempts,1 profile,1 request,1 approval. Intentional drift/mixed/prod flags not exercised. |
| Real auth / role checks | Sign in all three DEV-DEMO accounts using `/workspace-auth/csrf` + `/sign-in`; anonymous Employee pathway; Employee Expert queue; Expert Employee pathway | All three logins200, expected fixed org and single role. Anonymous401; both wrong-role reads403. Expert learner label is `Development employee`, not email. |
| REQ-002-F02 / RB-VB | L&D saves full-Occupation Blueprint45 questions/3600 seconds; preview and activate via adaptive baseline APIs | Capacity135,15 skills,3 minimum items/skill, minimum45; no missing parameters. Save200, preview200 feasible with45 samples/no shortage, activate200 version1 with actual model/mapping/parameter pins. |
| REQ-002-F01 / REQ-009 | Employee selects Information Security Officer / Junior; starts baseline, submits before answering, then starts a permitted replacement and answers45 presented items | Early manual submit yields INVALIDATED with null score/empty skills, preserving history and allowing replacement. Replacement AUTO_SUBMITTED/ADAPTIVE_STOP after45 answers, result15 skills and raw score0.17777777777777778. Real current mastery profile persisted. Answers cycled A/B/C/D from public presented options; no scoring-key lookup or outcome insertion. Subsequent baseline start409 ALLOWANCE_CLOSED despite low score. |
| REQ-041-F02 / gap | Same Employee previews exact Role+Level after baseline |200,3 KNOWN required skills, all positive gaps/LEARNING_REQUIRED, immutable mastery and exact gapInputHash. Preview is a GET; confirmation is separate. |
| REQ-001-F02 / REQ-042-F01 | Explicit POST initial-pathway-requests with expected selection and preview hash; durable worker |202 PENDING, then GET200 SUCCEEDED/AWAITING_EXPERT_REVIEW/VALID. Format2 proposal has3 modules,15 visited states, complete/PROVEN search for this fixture only. Replay returns same request; no duplicate request. This observation is not general optimizer proof or concurrency evidence. |
| REQ-019-F01 / REQ-020-F01-F02 | Assigned Expert excludes MOD-READ-INF08, validates, attempts approval, restores, validates, tries old revision then approves exact current revision/hash | Exclusion creates revision2 UNRESOLVED/MISSING_PROVIDER:MS-INF08; approval422 INVALID_PATHWAY_DRAFT. Inclusion creates revision3 VALID; old revision approval409 STALE_REVISION; exact revision3 approval200 APPROVED. Approval replay200 same revision/hash; post-approval edit409. |
| REQ-004-F01 / own view | Same Employee GET /employee/pathway |200 APPROVED revision3 with exact approved hash and order MOD-READ-INF08 → MOD-READ-SEC02 → MOD-READ-SEC09; frozen baseline3 skills. All entries UNAVAILABLE/CONTENT_ACCESS_NOT_CONFIGURED and null entry, as required for view-only scope. No learning completion or content readiness fabricated. |
| Auth/security smoke | Authenticated POST without CSRF; unknown pathway UUID; logout then reuse old cookie plus forged actor/role/org headers |403 FORBIDDEN;404 PATHWAY_NOT_FOUND;204 logout then401 UNAUTHORIZED_WORKSPACE. Re-login200 and own approved view remains200. Unknown ID is not a second-tenant isolation fixture. |
| Persistence/restart | `docker compose restart api`, then reuse existing session and GET current identity/mastery/pathway | Existing JDBC session still200; mastery retained; approved revision3/hash/order retained. Subsequent logout/re-login also retains committed results. No data reset or profile repin. |

Reproduction identifiers: Blueprint `66e1705a-9e85-4972-b292-0d5b1bbfa379` version1; invalidated attempt `e9bd1374-1f19-4367-b048-7b8cccbfeed0`; completed replacement `7c3f8452-55a9-49a6-8543-f3acb8c46a2c`; selection `50e55ff2-e4f0-4511-ab07-a40917c54811`; request/pathway `a2c6d0e0-8802-4b5a-b4da-98c0ce39a917`; approved revision3 hash `02152623c42d207267650c4b26c476d9f50c361e2b10ede2e43c5dac07b8d555`. Employee `01f1fb56-c545-3454-8c3e-68401f6ba3ef`, Expert `65999e61-977c-3547-bd5f-df0bb3752ca7`, L&D `d797db9b-c2f2-3f5b-98c5-ae20197f8b0c` in the fixed development org.

Local nonsecret inventory/observations: ignored workspace `.tools/audit-auth/20261029-c2-runtime/` contains before/final containers, volumes and data mounts, initial bean-collision log, final outcome counts and `manual-http-observations.json`. Credentials, cookies and CSRF tokens are excluded. These are machine-local supporting artifacts; this receipt holds the durable result summary.

Remaining: browser inventory is empty; attempts to open both iab and Chrome returned “Browser is not available.” No visual/dialog/keyboard/mobile/EN-VI/cache-switch acceptance was observed. Two-tenant isolation, expiry/revocation, outages, drift, concurrent CAS/fencing, legacy compatibility, numerical/optimizer/performance and production gating remain separately approved C3/owner scope. Shared Compose/manual HTTP journey is observed; full C2 UI acceptance and production readiness remain open. No commit/merge commit/push, C3/C4/C5 transition, production change or old-data deletion occurred. Stack is left running for user review.

## Expert Check and approval UX — 2026-10-29 C2 source follow-up

User approved the proposed REQ-019-F01 / REQ-020-F01-F02 UX slice and explicitly requested system colors/borders. This follow-up changes frontend presentation/orchestration only; no backend/planner/authorization/seed/schema change or data mutation was performed for verification. Current user-edited pathway is retained.

Implemented source:

- Check refreshes authorized Expert detail and checks the exact current hash. Confirm requires a successful current Check rather than falling back to the stored VALID flag. Saving, uncertain command outcome, verification failure, stale content, unresolved coverage and valid state are distinguished beside the action buttons.
- Invalid Check opens a wide error dialog with specific skill names/IDs, diagnostic explanations and candidate module suggestions from the real review Catalog. Suggestions retain PRIMARY/SUPPORTING/INCIDENTAL and difficulty distinctions, do not promise complete feasibility and do not create new prerequisite rules. Existing modules are excluded from suggestions; PRIMARY then lower preference penalty are displayed first. No auto-inclusion.
- Include in that dialog uses the existing exact revision/hash/idempotency command. Successful reconciliation updates the same Included/Excluded/Catalog/totals and checks the new revision; a subsequent Check failure does not turn an already committed Include into an uncertain mutation. Invalid edits remain editable, successful checks close the repair dialog and enable preview. Every edit invalidates the previous check.
- Confirm refreshes/rechecks and opens a snapshot-bound draft preview. The existing Employee Roadmap/Timeline and module/skill details render the authorized Expert draft with PREVIEW labels, null learning entries and no Employee API call. The footer distinguishes draft from approved; existing Employee projections retain their original behavior. Only the final Confirm and approve sends the retained approval command for the displayed revision/hash. External changes require a fresh review; cancel does not approve.
- Shared Dialog uses a body portal and topmost-dialog keyboard handling so nested module/skill details are not clipped by the preview scroller and Escape/Tab target the active dialog. Existing shared components, IBM Plex Sans, semantic orange/secondary borders, destructive error, warning and success tokens are reused. No new UI library or hardcoded color scale.

Actual verification: native TypeScript/build succeeded,2507 Vite modules; Docker Node22.23.4 `docker compose exec -T web npm run build` exit0,2507 modules; scoped9-file oxlint exit0,0 errors/2 pre-existing warnings in the legacy Employee branches (timeline set-state-in-effect; roadmap useMemo dependency). Existing large-bundle warning retained. Initial unprivileged native tsc could not write tsbuildinfo (EPERM); rerun with workspace write permission succeeded. `git diff --check` for the new working changes is clean. Manual read-only HTTP GETs returned200 for login and the Expert detail, validation, preview and shared Dialog Vite modules. No new Include, approval or other business mutation was submitted during this follow-up.

Browser inventory still returns no enabled apps/browsers. Interactive rendering, suggestions/Include interaction, popup close/cancel/final approval, nested focus/keyboard, EN/VI, desktop/mobile and Employee dialog regression are **Not run**; successful compilation or module HTTP200 is not visual/behavior acceptance. No executable tests were created/run; no C3/C4/C5 transition, commit or push.

Manual review procedure after refresh at `/expert/pathway-review/<assigned-id>`:

1. Before Check, Confirm stays disabled with instructions. Click Check on an unresolved draft: inspect the error dialog, specific missing skills, module names/difficulty and persistent action-area reason after closing it.
2. Include a suggested candidate once. Confirm the same page reflects persisted membership/totals and updated revision, then automatic Check either updates the remaining issues or closes the dialog/enables Confirm. Slow/failed/uncertain requests must expose status/retry without duplicate commands.
3. On a valid draft, Confirm opens draft Roadmap/Timeline. Compare module IDs/order/totals/skills/warnings with the included plan. Open/close a module or skill detail, use Tab/Escape, and verify focus/scroll return to preview. No learning entry or approval should be issued by preview.
4. Back to editing or X closes preview without approval. Open it again and use the final confirmation only when intentionally approving the current draft; verify APPROVED/locked state and exact own Employee projection. A changed revision must not be silently approved. Repeat EN/VI/mobile observations and ordinary Employee dialogs separately.

Status: C2 source/build complete for this UX slice; interactive acceptance pending. This supersedes the earlier silent disabled-button behavior, without promoting the overall integration to complete.

### Check latency follow-up — 2026-10-29

User approved narrowing the optimization to Check, with drag/drop already reported acceptable. Check now calls fresh `/validation` first and uses the currently displayed detail only when its content hash matches that fresh response; a changed hash triggers a detail reload, and mismatched input stays STALE. This removes one full detail/Catalog request from the unchanged Check path. No validation result cache, security bypass or backend/planner change was introduced. Opening the approval preview still refreshes detail and validates before showing an exact snapshot; final approval remains the existing server command. Queue invalidation no longer blocks the foreground edit/reconciliation flow. Current loading text/aria-busy distinguish the checking state using existing semantic styles.

Single bounded manual HTTP timing observations on the same revision67: sequential detail350ms + validation305ms =655ms; concurrent pair657ms (no clear benefit, concurrency was not retained); a subsequent validation-only call529ms with VALID/matching hash. These are individual C2 observations with variable timing, not a benchmark, browser measurement or guaranteed speedup. No Include/approval/data reset was performed. Browser interaction remains Not run because no browser is connected; manual review should confirm immediate checking feedback, unchanged-input one-validation request, changed-hash reload/STALE handling, and preserved preview/final confirmation.

Final Docker Node22 `npm run build` exit0,2507 modules; scoped3-file lint exit0,0 errors/0 warnings; changed diff clean. Vite detail module GET200 and API/DBs remain healthy. No executable tests/C3, commit or push. Prior UX and runtime evidence retain their original scope.
