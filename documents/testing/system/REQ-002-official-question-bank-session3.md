# REQ-002 Session3 — official runtime cutover and V23

2026-10-22, Asia/Bangkok. **V23 applied; main Compose startup and bounded anonymous HTTP observed. Operational adaptive flow remains unavailable.** Scope: REQ-002-F02 configuration, REQ-002-F01 attempts, REQ-009-F01/F02 pinned reads and C1/C2 dependencies. Explicit user authority covers D1 safe cutover, D2 inventory, this evidence and existing walkthrough updates. No Cluster3, executable-test creation/compilation/execution, stage, commit or push.

## Migration admission and preservation

Migration permission is independent of model/Identity/review readiness. Those dependencies still block business operations. V1–V23 source bytes were preserved; V23 SHA256 `404d77227e59d2d0da2d473198c597ae614275bf8aa58fa085cc16638bd37362`. SQL review found additive tables/functions/triggers only, no seed, UPDATE/DELETE/DROP of existing data, migration repair/squash or historical repin. Existing V18 account/model composite keys and reject_history_mutation support the new FKs/guard. Immediate selection validation, immutable receipt, insertion guard and deferred matching-receipt validation are compatible with the source promotion order (promote → selection → receipt → audit). This is source review, not observed business transaction correctness.

| Gate / command | Actual result |
| --- | --- |
| docker ps; inspect main postgres mounts/Compose labels; psql BEGIN READ ONLY | PostgreSQL17.6; container4e476ef8d486 before startup, database/user adapt_learn_graph; host15432→5432; data_directory /var/lib/postgresql/data; named volume adapt-learn-graph-dev_postgres_data; correct repo Compose project |
| Main history before | public.flyway_schema_history V1–V22/all successful;84 platform tables. Source checksums subsequently validated by Flyway, no repair |
| Fresh consistent backup22:16:45+07 | One REPEATABLE READ READ ONLY transaction exported snapshot00000040-0000000D-1; all-table canonical count/digest and22 history rows read in it. Separate pg_dump -U adapt_learn_graph -d adapt_learn_graph --format=custom --snapshot=00000040-0000000D-1 --file=/tmp/session3-v22-before.dump used that same snapshot before COMMIT |
| Readability | pg_restore --list and full pg_restore --file decoding both exit0; TOC includes target_selection and Flyway data. No restore was performed |
| Recovery copy | Workspace .tools/official-question-bank-session3/20261022/postgres-v22-before.dump;459989 bytes; SHA25602830103a2dedf2b7c118d23fb6e4c896a0682fd19e60e4130aee8110032eded. TOC/postgres-before.json/source-before/dirty patch retained alongside it |
| Java21 main jar local,migrate, target22, seed=false, administration=false | Validated23 migrations; existing schema22 up to date, no migration. Main jar V23 bytes matched source, retired seeder/bootstrap absent |
| Same main jar target23,22:18:39+07 | Successfully applied exactly1 Flyway migration; V23 checksum-1125147424; exit0 |
| Readback22:19:28+07 | All84 previous platform tables identical count/canonical-row MD5; all22 previous Flyway rows identical.86 platform tables now; two new tables empty |
| Schema readback |20 constraints validated,4 enabled custom triggers,3 functions, all20 new columns recorded. Deferred receipt constraint metadata retained. No trigger-rejection/race/authorization transaction was exercised |
| Main Compose rerun | Flyway again validated23 checksums; schema23 up to date/no migration necessary. No seed/import/profile or business operation added to startup |
| Final read-only after startup/HTTP | All86 platform tables plus Flyway canonical count/digest still match the immediate post-V23 snapshot; correct named data volumes retained and explicit main legacy/reveal/seed/administration flags false |

[Migration commands/selected output](REQ-002-official-question-bank-session3-migration.json) · [before/after table digests, full history and new schema metadata](REQ-002-official-question-bank-session3-database.json). Canonical row digest is MD5 of sorted to_jsonb(row)::text joined with newline, empty digest d41d8cd98f00b204e9800998ecf8427e. It is a preservation comparison, not an authorization or numerical oracle.

Both platform.irt_effective_parameter_selection and platform.irt_parameter_promotion_command have0 rows. Model/run/set/mapping/adaptive response counts remain0. All11 target selections/one current, bank/item bytes, receipts, audit and outbox remain unchanged. No actor, model, run, candidate, promotion, attempt or allowance was created/reset. Offline SYNTHETIC fits remain files, not a database candidate.

## D1 source → processing → storage → output

The intended path is real owner Identity/grants and approved Catalog release → full Occupation union + published bank → exact approved model/mapping + scoped effective parameter selection → adaptive Save/Preview/Activate → pinned Employee attempt/result/history. PostgreSQL owns all transactional state; Neo4j remains catalog-only. Missing prerequisites produce unavailable/denied behavior and no fallback bank/principal/parameters.

| Boundary | Current behavior / disposition |
| --- | --- |
| Main startup | compose.dev.yml postgres/neo4j healthy → migrate(local,migrate, seed=false) → api(local, health) → web. Existing official graph/bank are provisioned inputs; no automatic import/review/model bootstrap. Main Dockerfile uses -Dmaven.test.skip=true |
| L&D routes | App.tsx always routes /ld-manager/baseline-assessments and /:occupationId/* to AdaptiveBaselineRoute. Former nested fixed URLs redirect to the Occupation workspace. baseline-config and assessment-bank aliases retained as redirects. No flag-off fixed Generate/Review/Publish fallback |
| FE visibility | False VITE_ADAPTIVE_BASELINE_ENABLED or VITE_EMPLOYEE_ADAPTIVE_BASELINE_ENABLED renders a localized unavailable surface using existing PageHeader/Card/Text. True is visibility only, never authentication/readiness. Compose forwards both existing flags, default false |
| Employee entry | AssessmentPage diagnostic=true and retired DIAG-BASE/quiz-baseline module/moduleId/quiz aliases redirect to /employee/baseline-assessment; cards link there independent of visibility flag. Removed only fixed diagnostic sample attempt/quiz/92% card/success/unreachable launch banners and local completion-unlock branch. Generic module/RIASEC flows and shared stores/localStorage retained; existing stored data not erased |
| Legacy backend | LocalBaselineBlueprintConfiguration plus BaselineBlueprintController, BaselineAssessmentManagementController, BaselineAnswerReviewController and BaselineOccupationCatalogController additionally require assessment.baseline.legacy-authoring.enabled=true, default false. Main Compose explicitly false; answer-review default changed true→false. Old stores/contracts/readers retained. No configured L&D bean is registered by this legacy configuration on main |
| Adaptive/C backend | Existing local/demo wiring is still provisional/default-off. No trusted Identity/Catalog/readiness replacement exists to wire; do not enable it as production. Administration explicitly off in main Compose. No new permitAll, configured Admin, approval alias or source-policy change |
| Technical selection/history | findEffective(org,bank,model,mapping) retained for future versions, no global latest fallback. findPinned and full/legacy attempt/result/history readers untouched. Old promoted sets/receipts never deleted/demoted |

## Main startup and allowed observations

At the repo, the sole startup command is:

```powershell
docker compose -f compose.dev.yml up --build -d
```

Actual command exit0. Initial build completed main Java290 sources with test resources/compilation/execution explicitly skipped. Compose recreated the two DB containers using their existing named data volumes, then started migrate/API/WEB. A second cached invocation after canonical environment-name correction also exited0, retained DB containers and re-created migrate/API. No down/reset/reseed/volume removal. API/PostgreSQL/Neo4j healthy; migrate exited0; web running. Ports: WEB8088, API18080, PostgreSQL15432, Neo4j7474/7687, loopback only.

Fresh read-only graph payload comparison after startup: all827 nodes/all4536 relationships, every label/type/property/endpoint exactly match build_payload(official ontology0.8.0);6 constraints. Review remains NEEDS_EXPERT_REVIEW. [Graph observations/hashes](REQ-002-official-question-bank-session3-graph.json).

[HTTP/service/Flyway observations](REQ-002-official-question-bank-session3-runtime.json): health/status200; anonymous legacy/adaptive/discovery/Employee/Admin requests401; WEB routes200 deliver Vite shell. **HTTP denial establishes only the observed anonymous request outcome**, not role/tenant success, controller absence, revocation or protected-data acceptance. Shell200 is not rendered UI evidence. Browser inventory was empty and iab was unavailable; interactive UI/keyboard/responsive **NOT RUN**.

| Allowed verification | Actual result / limits |
| --- | --- |
| Java21 mvnw.cmd -B -ntp -Dmaven.test.skip=true package | Final290 main-source compile/package BUILD SUCCESS22:24:14+07;25 migration/seed resources. Test resources not copied; test sources not compiled; tests skipped. Docker build repeated the same main-only policy |
| Production TypeScript compiler API |139 production roots,0 test imports,0 diagnostics, including final diagnostic alias/banner review. Initial unused CardDescription import after cleanup removed. No tsc -b/test compilation |
| Direct Vite production build |2050 modules, success; pre-existing large-bundle advisory remains |
| Scoped oxlint on six changed TS/TSX files |Exit0;9 warnings in pre-existing AssessmentPage exports/effects/hooks. No warning treated as acceptance or silently fixed outside scope |
| Git/hash/links/diff checks |[Final preservation observation](REQ-002-official-question-bank-session3-preservation.json):38 protected migration/release files,14 release sidecars and28 Session2 source hashes unchanged; ontology/workbook hashes retained; tracked test diff identical to intake;14 changed runtime/config paths and36 new links checked, index empty/diff-check0. No stage/commit/push. Initial shell sandbox target-write denials retried for the same authorized work; no auto-review rejection |

Initial backup digest formatting attempt failed before dump/migration and was corrected; the successful exported snapshot above is the backup actually used. Initial graph HTTP read was interrupted during Compose DB recreation and retried read-only after health. An initial Admin probe used a non-handler URL and was replaced in reported route observations by the actual source templates (unknown sentinel IDs, anonymous denial only). None caused business writes.

## D2 inventory and rollback

[Exact path dispositions, consumer proof, compatibility and deferred cleanup](REQ-002-official-question-bank-session3-inventory.md) · [41 tables /387 columns /341 constraints, triggers, incoming FKs, counts and literal consumers](REQ-002-official-question-bank-session3-inventory.json). All schema cleanup is deferred; no destructive list is approved or executed. Empty rows do not prove obsolete structures. No new physical source-file deletion: the authorized D1 removals are exact imports/routes/mock blocks, backed up before editing. Existing Session1 removals/test-only moves remain as delivered, not repeated.

Rollback gates new admission/administration and uses a dual-reader-compatible binary. Keep V23 and all history; never down-migrate, repair, delete receipt/promoted sets or re-enable fixed/mock admission. Source-before copies support individual reviewed recovery; restoring App.tsx/legacy gates wholesale would restore retired behavior and is not the operational rollback. The verified dump is for a separately verified recovery target, not automatic overwrite of live volumes. No restore/old-binary compatibility run was performed.

## Remaining real dependencies and evidence gate

Source conflicts recorded: older demo cold-start/bootstrap permission is superseded by the current explicit no-seed/no-fake instruction; retired seeders stay removed. Historical fixed Generate/Review/Publish pages and global ACTIVE-only/configured-L&D discovery cannot stand in for the confirmed adaptive/owner authorization contract; they are unrouted/gated and retained for compatibility. Session2's V23 source-only restriction is superseded only by the current user's explicit migration permission; operational synthetic/Identity/model/review gates remain closed. No product policy or official content was changed to make those dependencies disappear.

1. Person1 trusted authenticated Employee/L&D/System Administrator, exact bank/model/Occupation grants and revocation coordination. Existing one LOCAL_DEMO EMPLOYEE account is creation attribution/REQ-001 compatibility, not a real authenticated test account or Admin.
2. Person2 authoritative approved/published Catalog snapshot/tenant grants and safe discovery. Legacy discovery is now gated with its fixed configured-L&D provider; adaptive chooser needs an owner adapter, not that fake identity.
3. Content review/publication for the135 DRAFT items; exact real approved model/mapping; immutable authorized dataset registry, actual-pilot alignment and promotion readiness. No synthetic-to-operational toggle.
4. Authenticated Save/Preview/Activate/list/Deactivate, full union start/resume/deadline/allowance, C persistence/promotion/new-vs-old pins and own/foreign full/legacy result/history remain **Blocked / NOT RUN** on this main environment. No DB historical attempt exists for a real legacy walkthrough; mark N/A, never manufacture/reset it.

The [existing Vietnamese walkthrough](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md) and [current consolidated walkthrough](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md) contain conditional steps/actual fields. All39 existing acceptance IDs, QBI-01–09, C1-01–04/C2-01–04 and new D1/D2 cases remain Planned/Not run for executable evidence. Future explicitly approved Cluster3 must cover real-adapter migration/transaction/guard rejection/CAS/races/rollback, parser/numerical/security/tenant/read-no-write/history, frontend regression and agreed performance; disposable one-time Testcontainers, never main volumes. No new executable files/methods/runners in Session3.

Confirmed: V23 authorization and preservation, safe D1 routing/default-off legacy, D2 inventory/DDL deferral and guide scope | Provisional: existing local/demo runtime | Open: real owner wiring/model/review/pilot and authenticated/browser/executable evidence | Rejected: synthetic promotion, fake actor/approval, history reset/down-migration, blanket DROP and adaptive-ready claim from startup.
