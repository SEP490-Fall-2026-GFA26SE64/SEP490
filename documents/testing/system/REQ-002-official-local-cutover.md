# Official local data cutover — manual observations

2026-10-22, Asia/Bangkok. User explicitly authorized removing old Neo4j demo seeds, following the current official schema/package and preparing local question-bank data. No production bank CRUD/import-actor workflow, C calibration/promotion, executable test runner or test compilation was performed. This follow-up supersedes the earlier Session1 live/import blockers; historical evidence retains its original scope.

## Actual operations and readback

| Operation | Actual observation | Limit |
| --- | --- | --- |
| Recovery preparation | Source copies/dirty patch, typed graph/schema export and PostgreSQL V7 custom dump197579 bytes in workspace .tools/official-data-cutover/20261022;53 platform-table count/digest snapshots | Recovery material, not executable evidence; no old backups deleted |
| Exact legacy graph cleanup | Rechecked against export, removed11 nodes/13 relationships/11 constraints from main local graph only | User authorization supersedes earlier no-reseed restriction; PostgreSQL references not relabeled |
| Existing official validator/importer | Package SHA2560006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125;827 nodes/4536 relationships,6 constraints; complete graph property/edge payload equals official transformed package | Review remains NEEDS_EXPERT_REVIEW, null reviewer; no mock properties added |
| Identical graph import rerun | Existing importer reported exact release already present; no changes | No concurrent-writer/failure-recovery suite |
| Java21 main package | mvnw.cmd -B '-Dmaven.test.skip=true' package;266 main sources,24 migration/seed resources, BUILD SUCCESS19:45:41 +07; logs explicitly skip test resources/compilation/execution | No executable acceptance; no Docker build/fixture stack |
| Main artifact inventory | No removed seeders/bootstrap/GraphSchemaMigrator/old graph scripts or dev bank in production jar | Historical compatibility utility/resources now test-only |
| Real Flyway main migration | Main jar local,migrate profile validated22 migrations; applied15 migrations V8–V22 from V7, finished at V22 around19:46:34 +07 | V1–V22 source bytes unchanged; no squash/repair/down migration |
| Official DRAFT bank import | Main jar local,question-bank-import plus explicit local-seed=true; actual configured existing EMPLOYEE supplies creation FK; created135/existing0 at19:47:18 +07 | No Admin/reviewer created, no item publication/model promotion |
| Identical bank rerun | created0/existing135 at19:47:24 +07 | Transaction/idempotency observed on this exact input; exhaustive conflict/rollback/race cases remain unrun |
| Full item readback | One bank,135 DRAFT versions,15 skills,9 each;45 EASY/45 MEDIUM/45 HARD; all persisted item fields including response/key/hash match manifest | Protected content compared in memory, not printed or copied into frontend |
| Existing-data comparison |51 of53 original platform tables byte-equivalent by canonical-row MD5/count; only question_bank/item_version changed. All11 target_selection rows unchanged,1 current; no model/IRT/Blueprint/attempt/result inserted | PostgreSQL history preserved; existing UUID selection cannot be silently mapped to new catalog string IDs |
| Frontend static/build |139 production TS roots,0 diagnostics/0 test imports; Vite2064 modules; changed-file lint exit0 | Existing bundle>500kB advisory and existing WorkspaceLayout set-state-in-effect warning. No browser interaction or API end-to-end claim |

[Machine-readable readback](../../dataset/question-bank/15-1212.00/local-readback.json) records exact bank creator/time, counts, each-skill coverage, graph/schema parity, migration versions and retained-data digests. [Cutover contract/inventory](../../dataset/question-bank/15-1212.00/LOCAL_CUTOVER.md) explains approved cleanup and rollback boundaries.

## Source cleanup and compatibility

- Removed DevelopmentCatalogSeeder, DevelopmentTargetSelectionSeeder and their obsolete GraphSchemaTest/seeder-only test method. No new tests. GraphSchemaMigrator and V1–V4 graph scripts moved byte-for-byte to test scope for existing legacy repository coverage. Existing historical test evidence is not rewritten as current Pass.
- Fixed-bank development catalog fixture moved outside frontend production src, with two existing historical test imports updated only. No test compilation/run.
- Removed1417-line baseline-config mock/localStorage writer page and duplicate sidebar entry; old URLs redirect to baseline-assessments directory. Shared module/RIASEC/Identity/learner state retained. No browser-localStorage reset.
- Legacy graph CRUD controllers for TargetRole/MicroSkill/Prerequisite now require catalog.legacy-api.enabled=true. Default official deployment cannot write the old schema through those routes. Their owner's new-schema implementation remains open; no fake fields or UUID bridge supplied.
- Dockerfile now uses -Dmaven.test.skip=true. Main PostgreSQL migrations retained, because recorded prior Flyway V22 execution makes squashing unsafe. No new SQL migration added.

## Acceptance and remaining gates

Existing39 adaptive IDs and QBI-01–07 remain Planned/Not run. Add planned QBI-08 for explicit local-seed gates/real creator/foreign-inactive/prod denial, QBI-09 for no legacy writer/seed in official startup and historical fixture isolation. Actor/tenant fixtures and executable file/method/commands are TBD in separately approved Cluster3; this document does not implement/run them.

Bank is now stored and verified locally, but adaptive readiness is **not complete**: bank DRAFT, catalog/content unreviewed, no model/parameter sets, C not implemented. Remaining runtime Identity/Catalog/role-selection contract alignment must fail closed; no a/b/c or reviewer fabricated. There is no new automatic bank import in Compose startup; current volume contains the imported bank, and graph/bank exact reruns are available through the documented operations.

Only main DB containers remain running. No old A7/AB stack recreated, no unrelated volume/history/source backup deleted. Offline named volumes may contain retained history; they were not blindly removed under a Neo4j source/data cleanup request. Git HEAD/index/stash and all user edits preserved; no stage/commit/push.

Rollback: gate new runtime use and restore into a separately verified recovery target from the V7 dump/typed legacy graph export if needed; do not down-migrate the live V22 database or reset history to replay a demo. Preserve both backup sets until the local cutover is accepted.
