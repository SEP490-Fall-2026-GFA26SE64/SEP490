# REQ-041/042 catalog0.11 — C2 source/build receipt

Later authorized native work supersedes this receipt's unapplied/no-runtime state: [fresh V1–V28/catalog0.11 cutover and bounded manual observations](REQ-041-042-v011-native-cutover.md). The12:19 artifact/commands/limits below remain historical; the later12:57 artifact additionally supports native seed paths. No C3 acceptance is inferred.

Date:2026-10-28, Asia/Bangkok. This is **Cluster2 build/static-review evidence**, not executable-test, DB, optimizer-correctness, security or full-flow acceptance. User approved C1 and explicitly requested C2 source updates; DB/runtime/UI checks are deferred to the other machine. No runtime fake was added for missing readiness/content contracts.

## Source, environment and artifacts

- Branch Generate-Initial-Adaptive-Pathway, base HEAD5b17c7768dee4dbcee3a19881177e5b476b4350a; owner main4c33273 and c932981/7080f00/85e1ff6 preserved. Changes remain uncommitted/unstaged. The12 preceding C1 Markdown changes are retained.
- Windows PowerShell; Oracle JDK21.0.12.1, Maven Wrapper3.9.11, Node26.12.1/npm11.20.0. Node differs from tracked Dockerfile's22; this receipt certifies only the actual build environment. No tool reinstall/system PATH modification, Docker or DB installation.
- `npm ci --no-audit --no-fund` installed186 packages using the lockfile, exit0; no dependency versions changed. Initial Maven wrapper TLS/download failed in sandbox; approved retry downloaded Maven/dependencies into workspace .tools. Subsequent package used the workspace-local cache.
- Final BE package finished12:19:30+07:00 after static-review correction of invalid-draft coverage explanations,344 Java sources, release21. JAR SHA256: `09489f7fe548687944c8b6ec199de33132cb7a43d68ebec9c5c3de242c26c168`.
- Final FE build/scoped lint completed by12:05:57+07:00. Web entry SHA256: `d05ec5fc91f5fc380ec898573c10be91ff414c59ec34aa9ad8a0bfa411dfca9b`.
- Workspace-only source inventory `.tools/verification/pathway-v011-20261028/runtime-files.sha256`:30 runtime/config/migration files, SHA256 `86c161430550bf657895dbd0b78f54b793fd45e5d751eace3aaddb1570947a7c`. This captures uncommitted source, including new files; base HEAD alone does not identify the build. The manifest is not learner/test evidence.

## Actual checks

Build actor/tenant/fixture: developer, no application actor/tenant/DB fixture; trigger is compilation of the scoped source, not an API request. Acceptance references identify affected scope, not passed executable rules.

| Scope / Function mapping | Command / actual result | Limits |
| --- | --- | --- |
| G13/P01–P20/R01–R14/E01–E09 source compatibility | backend: `mvnw.cmd -B -ntp -Dmaven.repo.local=B:\project\SelfSEP490\.tools\m2 -Dmaven.test.skip=true package`, JDK21 process-local JAVA_HOME/PATH; exit0 BUILD SUCCESS | Resources/test compilation/test execution explicitly skipped. Existing deprecated-API note retained. No Spring app/startup/SQL/API behavior asserted |
| API/Role/Expert/Employee FE type/bundle compatibility | frontend: `npm.cmd run build`; exit0, TypeScript + Vite8.3.0 | Existing large-chunk warning remains (~2.58MB main JS before gzip). No browser/visual/runtime acceptance |
| Eight changed FE runtime files | `npm.cmd run lint -- src/shared/api/initialPathway.ts src/shared/api/initialPathwayMessages.ts src/shared/components/InitialTeachingDetails.tsx src/features/employee/components/InitialPathwayModules.tsx src/features/employee/pathway/InitialEmployeePathway.tsx src/features/expert/pathway-review/ExpertPathwayDetailPage.tsx src/shared/i18n/translations/en.ts src/shared/i18n/translations/vi.ts`; exit0 | Scoped oxlint, no suite execution |
| Git/scope/static review | `git diff --check`; no staged entries; no changes under executable tests, owner dataset/importer, applied V27 or learner DB | Code inspection/build cannot prove legacy numerical/hash round-trip, optimality, SQL validity, race/security or API integration |

## Implemented source, pending runtime proof

- New catalog reads exact per-pair focus/difficulty and full selected-candidate teaching inventory; verifies one Primary per Module. Current bootstrap source pins0.11/f7325462…/994 nodes/5121 edges, Compose uses a new v011 volume and retains old volumes. Nothing was imported/run here.
- Policy `mastery-thirds-focus-v1` uses exact3m comparisons/own UNKNOWN reason. Prerequisite-only learning needs require their own actual mastery/UNKNOWN evidence through the owner port. No fixed learning gains, baseline reset or mastery conversion.
- Planner `initial-whole-path-v2` proves Primary availability over the full eligible universe, then uses bounded iterative search/admissible quality and distinct-cost bounds. Complete plans use the confirmed lexical objective; search exhaustion is explicit SEARCH_LIMIT/NOT_PROVEN, without published valid proposal. Review freezes Expert's module set. These are source properties, not executed optimizer assertions or a benchmark.
- Static review corrected failed fixed-set draft construction: Supporting is not labeled responsible coverage/Primary-unavailability fallback when a usable Primary exists or its absence has not been proved. The selected Module remains visible for repair; the blocking reason stays explicit. Backend was packaged again after this change; no executable case was run.
- `Plan` separates blocking diagnostics, warnings, quality, frozen needs and search scope/proof. Execution scope/visited-state counts are immutable run metadata outside learning-content hash, so revalidating the same content does not change its approved identity. Focus/difficulty/coverage/warnings/quality/needs/source-policy pins/dependencies/overrides remain hash-bound.
- V28 source adds revision format discriminator and immutable scoped teaching_v2 records. Codec dispatches raw historical format1 versus enveloped format2; original format1 hash algorithm remains, no old label conversion. JDBC writes format2 children and no fake instruction_level. V28 is **not applied/SQL-verified**; compatible schema/readers are required together.
- Local semantic source retains exact v08/v010 eligibility recognition and adds v011, passing original Evidence unchanged. Additional historical artifact paths are configurable for native execution. Actual old profile round-trip still Not run.
- TMP-REQ001-09 assignment adapter is implemented/default-off under existing local/!prod gates, configured Expert/tenant/Role scope, explicit bounded proposal query and versioned local assignment identity. It checks active account/grant and a real persisted exact approval; does not create account/assignment/approval/readiness rows. Gate-off leaves the denying adapter. No runtime authorization claim.
- Existing API/FE now carries nullable legacy instructionLevel versus new typed enums, coverage and attention notes. Candidate pairs group by Module; selected totals count once. EN/VI surfaces keep current shared IBM Plex Sans/token primitives. DESIGN_SYSTEM.md has an older scale; actual tokens and AGENTS govern without changing typography. Employee shows explicit search-limit reason, safe notes/locks and no mock unlock.

## Blocking integrations and deferred observations

No application API, remote DB connection, migration/import, worker, manual mutation or browser was started. No executable test file/suite/assertion harness was created/run; G/P/R/E executable cases remain Planned/Not run, including hash/optimizer/tenant/race/fencing/integration cases. No full C2, C3, production readiness or performance claim.

Documentation QA found13 changed/new product Markdown files,28 new/changed local link occurrences resolving to files/fragments, balanced fences and clean diff whitespace; workspace links also resolve. Runtime fingerprints match the final source inventory. These are scope/artifact checks, not executable acceptance.

`ReadinessDefinitions`, `LiveReadiness`, `Availability` and `ContentAccess` still use explicit unavailable adapters until owner implementations exist. No actual module/content/start/internal-segment controller mounting was found; REQ-007/008 contracts still have clarification items. A reachable external DB or local Markdown scaffold does not supply those contracts. With defaults, positive/UNKNOWN admission lacks readiness-version pin and returns PLANNING_POLICY_NOT_CONFIGURED; setting a version string alone does not implement the owner, and later real dependency calls still deny. The current scope cannot demonstrate generation→approval→learning success until these inputs are integrated.

Evening manual verification: actual environment/source/actor/tenant/fixture/steps/results must be recorded. First verify compatible V28 schema and exact sealed0.11 release on the designated DB machine under separate DB authority; preserve all old profiles/pins/history. Native API runs `local,local-baseline-demo` with Flyway disabled, no migrate/seed profile. Configure real endpoints/secrets, local gates, server Expert mapping, source/history file paths and explicit search/worker settings; only use the actual owner readiness version/adapter. Do not invent one to bypass admission. Existing same-origin frontend proxy can point at API18080. Detailed Vietnamese operator steps are maintained in the workspace guide, not executable evidence.

Rollback: stop new admission/worker/review mutations and disable local substitutes; keep forward schema, both format readers, old release/history/content refs and every immutable record. Do not deploy a format1-only reader after format2 writes, down-migrate/reset/repin, delete old volumes or restore browser approval. No commit/push/history rewrite was performed.
