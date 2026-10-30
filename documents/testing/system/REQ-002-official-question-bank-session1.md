# REQ-002-F01/F02 — official bank Session1 observations

**Subsequent authorized follow-up:** main graph replacement, PostgreSQLV22 migration and135-item DRAFT import/readback are now recorded in [local cutover observations](REQ-002-official-local-cutover.md). The original Session1 Not run/blocked results below retain their original phase; they are not the latest DB state.

2026-10-22, Asia/Bangkok. Authorized scope: Q1–Q5 source inventory, one full-Occupation official-source DRAFT bank, importer/minimum seed wiring and document synchronization. This is **not executable-test evidence**. No unit/integration/system/Playwright runner, test compilation, application startup, migration or DB import ran. Existing 39 adaptive acceptance IDs remain Planned/Not run.

## Artifacts and identity

[Release and complete scope](../../dataset/question-bank/15-1212.00/README.md): OCC-15-1212.00, ontology 0.8.0; eight active Roles, 24 Levels, 15 skills, 135 DRAFT versions. Manifest SHA256 `52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882`; scope `c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231`; original ontology `0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125`. Scope stores 138 graph-normalized nodes/622 relationships and 250 requirement paths. Bank UUID `2f79de6b-dc62-51a1-982d-0be9d6f588dc`. No owner/organization/reviewer UUID invented.

## Allowed observations actually performed

| Observation / command | Environment and actual result | Limits |
| --- | --- | --- |
| git status --short, branch/HEAD, cached/working diff, stash and merge-state reads | Initial product clean; HEAD70679bb43e1798f1235a17d6a9a843701e76a796, original branch, empty index/no merge; stash3a8b19d retained | No fetch/merge/stage/commit/push |
| Read-only ZIP/XML workbook comparison with ontology JSON | All six node sets and seven relationship sets matched IDs and fields; zero mismatches | File observation, not live graph parity; workbook untouched |
| Inline JSON/shape/hash/coverage/sidecar inspection | 135 distinct prompts/UUID versions, 45 skill-difficulty cells, exactly3 each; four distinct options/one key; every canonical item hash and all option explanations/source references agree | No empirical item quality or human expert review |
| Official publication/PDF/RFC opens and relevant section inspection | Eleven primary technical sources; exact item-to-section mapping in authoring sidecar | Original scenarios apply source principles; not a certified exam |
| Read-only docker ps after sandbox access retry | No running containers returned | No container/volume lifecycle command used |
| TCP connect observations at documented 127.0.0.1:7687 and :7692 | Both timed out; relevant URI/credential environment variables absent | No alternative graph created or credentials guessed |
| mvnw.cmd -B '-Dmaven.test.skip=true' compile | Java21, Spring Boot3.5.16; final BUILD SUCCESS269 main sources,28 migration/seed resources; 16:49:08 +07 | No test sources/phase. Main compilation is not runtime/SQL acceptance |
| TypeScript compiler API via stdin, exclude **/*.test.*, **/*.spec.*, __tests__, src/test | 141 production roots,0 diagnostics; imported test sources0 | First node -e invocation failed shell quoting before type-check; corrected stdin command succeeded |
| node_modules/.bin/vite.cmd build |2065 modules, success; existing >500kB bundle advisory retained | Vite production build only, no tsc -b or test compilation |
| node_modules/.bin/oxlint.cmd changed BaselineBlueprintPage.tsx | Exit0 | Scoped static lint only |
| Static official-content/bundle and adaptive DTO inspection | No official bank ID/item UUID/hash/prompt/rationale payload imported into bundle; fake catalog fallback token absent | Existing generic samples/manager reveal code still use answer-key property names; see consumer inventory. No runtime API leak assertion |
| Migration/source/backups hash inspection and git diff --check | V1–V22 and official schema/ontology/workbook/seed unchanged; source recovery copies retained; whitespace check clean | No volumes/history queried or mutated; no live historical digest claimed |

Old dev-bank JSON left in generated target/classes by resource copying was removed by exact path after compilation; deleted bootstrap/importer classes are absent from generated main classes. No target/test-classes deletion or test command. Source backups alone were added under workspace .tools; no helper/fixture/stack created.

Final [static preservation/content observation](../../dataset/question-bank/15-1212.00/static-observation.json) records the byte/hash/coverage/sidecar checks, all135 official item UUID/hash/prompt and540 rationale strings absent from the bundle,24 resolved new local documentation links, unchanged HEAD/branch/stash/empty index,22 unchanged migrations, unchanged official source files and intact source recovery copies. This is file evidence, not a live DB/history readback or executable acceptance result.

## Unexecuted acceptance mapping

The [pre-code contract](../../dataset/question-bank/15-1212.00/IMPORT_CONTRACT.md) specifies expected behavior. The rows below are future Cluster3 scope, separate from the existing 39 adaptive IDs. Test file/method/command: **TBD only after explicit approval**, not created/run.

| ID / acceptance | Actor / tenant and future fixture | Trigger / expected outcome | Result |
| --- | --- | --- | --- |
| QBI-01 full exact scope | Authorized operator, real catalog release; extra/missing/drifted/duplicate node/ownership variants | Import validation rejects changed active union or property/version; no PG writes | Planned / Not run |
| QBI-02 owner/target/bank isolation | Actual active Admin in OrgA, inactive/non-admin/OrgB and wrong JDBC target variants | Authorized scope only; deny missing/foreign/revoked/inactive state, no insert | Planned / Not run |
| QBI-03 atomic create/rollback | Approved OrgA owner; official manifest in disposable real adapters | First import creates135 DRAFT; injected failure rolls back bank/items together | Planned / Not run |
| QBI-04 exact replay/conflict | Same owner/bank; identical rerun and each-field/identity/item-version/cross-bank/state drift | Exact rerun0 writes; every conflicting identity/content rejects; existing rows unchanged | Planned / Not run |
| QBI-05 concurrency/retry | Two authorized operations and competing existing writer | Serialize or rollback on collision/timeout; identical retry safe; unknown commit reconciles | Planned / Not run |
| QBI-06 publication/protected data | L&D/Employee/Admin, same/foreign tenant; DRAFT bank, safe Preview/Employee routes | DRAFT excluded; no new key/rationale payload in public DTOs/FE assets | Planned / Not run |
| QBI-07 history/read-only/no bootstrap | Historical published/pinned versions and retained attempts; read-only graph credentials | No graph write/history change; no startup fake seed/auto-promotion; legacy reader compatibility | Planned / Not run |

## Pending prerequisites and handoff

- Live graph read-only connection/exact parity: Blocked, no configured working service/credentials.
- PostgreSQL target/real owner/organization/write authorization: not established; import/readback Not run. Atomicity/idempotency are implemented source contracts, not observed DB outcomes.
- Catalog expert approval/release/tenant permissions; content expert review/publication; real Identity integration: Open. Keep source NEEDS_EXPERT_REVIEW/null fields; importer accepts DRAFT only.
- Model/numerical policy, responses/pilot/calibration/Admin promotion: Session2, not implemented. No IRT constants inferred from difficulty or ontology.
- Broad route/bean/mock/localStorage/Compose dependency cutover, Dockerfile test-compilation fix and final walkthrough: D1/Session3. Existing guide is conditional, not newly passed.
- No data/volumes/history reset/reseed/repin/rescore, no schema migration or C/D/Cluster3/commit/push. Roll back source gates without removing preserved data/pins. See [inventory](../../dataset/question-bank/15-1212.00/SOURCE_INVENTORY.md).
