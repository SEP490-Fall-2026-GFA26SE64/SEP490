# Session3 D1/D2 exact disposition inventory

2026-10-22. [Actual observations](REQ-002-official-question-bank-session3.md). **No destructive DDL or physical source-file removal in Session3.** The earlier Session1 approved deletions remain untouched. The user's D1 instruction authorizes rerouting/removing fixed baseline fallback after consumer inspection; it does not approve arbitrary DROP or deleting a shared store.

## Runtime call graph and owner gaps

```text
compose.dev.yml
  postgres/neo4j existing volumes, health
  -> migrate: local,migrate -> Flyway V1..V23 -> DatabaseInitialization SELECT1/close
  -> api: local -> SecurityConfiguration + existing gated local configurations
  -> web: Vite -> App baseline routes -> visibility/unavailable

future authorized operation (currently blocked):
  real Identity/grants -> AdaptiveBlueprintService
    -> AdaptiveBaselineCatalogPort [approved owner adapter missing]
    -> eligibility [published bank + model/mapping + findEffective(org,bank,model)]
    -> PostgreSQL Blueprint/current/receipts
  Employee -> ContextPort -> SnapshotResolver -> pinned attempt/content/policy
    -> JDBC response/finalization -> exact result/history readers
  actual Admin -> Authorization/Readiness/DatasetSource [missing]
    -> CalibrationService/V18 -> separate PromotionService/V23 pointer/receipt/audit
```

OfficialQuestionBankImporter is an explicit separately provisioned operation, not a startup runner on local alone. Existing135 DRAFT items are not reimported or published. C's SYNTHETIC artifacts are not an alternative effective parameter source. Production SecurityConfiguration denies other routes; no new authenticated owner implementation is supplied. Existing REQ-001 configured local dependencies remain compatibility work, not official actor/grant evidence.

## Exact changed paths and consumer proof

Paths below are relative to the repo. Recovery copies use the identical path under workspace `.tools/official-question-bank-session3/20261022/source-before/`.

| Exact path | Consumer/source proof and disposition | History / compatibility / rollback |
| --- | --- | --- |
| compose.dev.yml | Main startup consumer; add explicit false seed/legacy-authoring/answer-review/administration and forward two existing FE visibility flags | Existing data volumes/ports preserved. No importer/model/fixture helper. Keep new gates off on rollback |
| backend/src/main/resources/application-local.yml | Local config consumer; add false legacy-authoring, answer-review default false | Compatibility operator can explicitly opt in outside main; no auth guarantee follows. No default restoration of retired behavior |
| backend/src/main/java/com/adaptlearngraph/assessment/infrastructure/LocalBaselineBlueprintConfiguration.java | Fixed stores/services/configured LD_MANAGER actor plus legacy discovery/capacity; now extra false gate | Retain source/tests/readers. Main no fake L&D registration from this file; adaptive discovery replacement requires owner contract |
| backend/src/main/java/com/adaptlearngraph/assessment/api/BaselineBlueprintController.java | Fixed Blueprint/generate/review/publish handler; now same false legacy gate | No replacement fixed writer, no old data deletion. Stored fixed versions/readers remain |
| backend/src/main/java/com/adaptlearngraph/assessment/api/BaselineAssessmentManagementController.java | Fixed management/generate/review/publish/restore; same gate | Keep legacy transition/receipt decoding; no new starts through it on main |
| backend/src/main/java/com/adaptlearngraph/assessment/api/BaselineAnswerReviewController.java | Protected fixed-answer reveal; same gate, answer-review also off | No keys moved into adaptive Preview/Employee payload; old audit table retained |
| backend/src/main/java/com/adaptlearngraph/assessment/api/BaselineOccupationCatalogController.java | Depends on legacy configured-L&D discovery/capacity; gate consistently with provider | Do not wire this ACTIVE-only global adapter as authoritative Catalog. Owner safe discovery is still missing |
| frontend/src/app/App.tsx | Sole route registry. Removed imports of five fixed pages and flag-off fixed route branch; aliases still redirect; wildcard adaptive route handles old suffixes | Physical old pages remain for historical tests/review, not production route fallback. Exact attempt/result route retained |
| frontend/src/features/manager/baseline-assessments/AdaptiveBaselinePage.tsx | Sole L&D baseline route; false flag renders unavailable before hooks/API calls, true retains existing adaptive workspace | No fake catalog on error or fallback to fixed pages |
| frontend/src/features/employee/baseline-assessment/EmployeeBaselinePage.tsx | Sole Employee baseline route; false flag now unavailable, no redirect back to generic mock flow | Actual historical result/history components/readers retained; disabled gate makes route unavailable rather than resetting data |
| frontend/src/features/employee/assessment/AssessmentPage.tsx | Only caller of its fixed diagnostic seed/quiz/card/unlock blocks. rg imports/calls showed completeDiagnosticAssessment used here; caller removed. Final review found another launch banner unreachable after the identical lock-condition return; removed with no consumer. No main consumer requires these baseline-only blocks | Removed att-diag-base and quiz-baseline sample objects,92% stat/banner, locked diagnostic launches, diagnostic modal fallback and local completion-unlock branch; baseline handoffs unconditional. diagnostic=true and retired DIAG-BASE/quiz-baseline module/moduleId/quiz aliases redirect, never substitute a generic quiz. Keep generic scoring/module/RIASEC/storage. No localStorage erasure |
| frontend/src/shared/i18n/translations/en.ts and vi.ts | Existing language dictionaries; add only equivalent unavailable labels | Use existing IBM Plex Sans/tokens/PageHeader/Card/Text. No new design scale |
| frontend/.env.example | Document visibility-only semantics, not fake actor setup | False never restores fixed baseline; production owner gates separate |

Zero-consumer proof for removed behavior is **bounded to these exact blocks/import edges**: fixed page imports were the route-registry entry points; diagnostic samples/unlock caller were private to AssessmentPage; no external imports of those private constants. All remaining exported/shared consumers are retained. This is static proof, not browser or executable acceptance. Exact before/current source hashes and Git diff are recoverable; no class-prefix mass removal.

## Retained/deferred source paths

| Exact retained path(s) | Main/config/test/doc consumer and reason | Disposition |
| --- | --- | --- |
| frontend/src/features/manager/baseline-assessments/{BaselineAssessmentManagementPage,BlueprintVersionsView,BlueprintRevisionPage,AssessmentVersionsView,AssessmentVersionPage,AssessmentManifestEditor}.tsx | Old fixed pages mutually import management APIs/manifest; BlueprintVersionsView.test.tsx, BlueprintRevisionPage.test.tsx and historical system evidence still reference them. App no longer imports them | DEFER physical removal; no approved exact deletion batch; keep historical evidence intact |
| frontend/src/features/manager/baseline-blueprints/{BaselineBlueprintPage,BaselineRoleConfiguration,BaselineWeightControl}.tsx and baselineBlueprintApi.ts/baselineBlueprintForm.ts | BlueprintRevisionPage/historical component/form tests; legacy counts/weights contract. Not new adaptive authoring | RETAIN gated/unrouted compatibility; no blind whole-directory delete |
| frontend/src/features/manager/baseline-assessments/baselineAssessmentManagementApi.ts | Fixed pages/tests; old request/receipt DTOs | RETAIN; no new production baseline import edge from App |
| frontend/src/features/employee/components/DiagnosticAssessmentCard.tsx | rg symbol search finds declaration only in current src, but no exact physical-deletion approval; shared profile conventions need review | DEFER; unused component is not routed by this cutover |
| frontend/src/shared/hooks/useEmployeeLearningState.ts | Many module/pathway/profile/RIASEC consumers; exported completeDiagnosticAssessment has no remaining production call after D1, but store is shared | RETAIN entire store/localStorage. Owner migration separate; not authoritative baseline completion |
| frontend/src/features/employee/{pathway/AdaptivePathwayPage,gap-analysis/CompetencyGapAnalysisPage}.tsx | Existing diagnostic=true links | KEEP aliases; AssessmentPage now redirects to official baseline route even with FE flag off |
| frontend/src/features/manager/assessment-bank/AssessmentBankPage.tsx | /expert/assessment-bank and module/shared content authoring | KEEP; separate generic/Expert bank surface, not imported official bank. No bank-publishing permission inferred from this mock UI |
| backend/src/main/java/com/adaptlearngraph/assessment/infrastructure/JdbcBaseline{BlueprintStore,AssessmentDraftStore,AssessmentManagementStore,AnswerReviewStore}.java | Retained fixed services/controllers/tests and persisted historical shapes | KEEP; disabling authoring is not authority to remove history contracts |
| backend/src/main/java/com/adaptlearngraph/assessment/adaptive/infrastructure/{JdbcAdaptiveBlueprintStore,JdbcAdaptiveTechnicalVersionStore,AdaptiveBlueprintJson}.java | Adaptive/history, old receipt replay, exact findPinned and deprecated findPromoted compatibility | KEEP; future eligibility uses scoped findEffective only. No numerical/model policy edit |
| backend/src/main/java/com/adaptlearngraph/assessment/adaptive/attempt/infrastructure/ | Resume/result/history with explicit full/legacy snapshots, pins/deadline/allowance | KEEP all; no state conversion or historical relabel |
| backend/src/main/java/com/adaptlearngraph/catalog/ and learning/ REQ-001 adapters; competency/ repositories | Shared code/tests and old UUID/catalog_reference contracts differ from official string/Level schema | KEEP; legacy writing controllers stay default-off; owner alignment OPEN, no UUID bridge or fake graph properties |
| backend/src/test/java/com/adaptlearngraph/catalog/infrastructure/GraphSchemaMigrator.java; backend/src/test/resources/db/neo4j/; frontend/test-fixtures/legacyBaselineCatalog.ts | Session1 moved compatibility-only consumers; test imports retained | KEEP exactly as delivered; no test file edit/compilation/runner in Session3 |

All curly-brace path groups above enumerate exact filenames, not deletion globs. No shared state/data cleanup occurred. Session1 removed DevelopmentCatalogSeeder, DevelopmentTargetSelectionSeeder, DevelopmentQuestionBankImporter, AdaptiveTechnicalBootstrap, old main graph scripts/dev bank and BaselineAssessmentConfigPage remain removed; no repeat graph cleanup/import or source restoration.

## Exact schema inventory, consumers and deferred DDL

[Machine-readable inventory](REQ-002-official-question-bank-session3-inventory.json) enumerates every actual column name/type/null/default,341 named constraints/definitions, custom triggers, incoming FKs and41 relevant table counts. Per-table literal consumer lists are divided into runtime, configuration/migrations, test and product documentation. Search was `rg -l -F <table>` over explicit roots; dynamic/transitive consumers require further review. An empty literal list is **not** zero-consumer proof. Every listed schema object is **RETAIN**, no destructive DDL approved/executed.

| Candidate legacy fields / structures | Concrete consumers / references / compatibility | Decision |
| --- | --- | --- |
| baseline_blueprint_skill easy_question_count/medium_question_count/hard_question_count; baseline_blueprint_role easy_score_weight/medium_score_weight/hard_score_weight | V9 fixed schema, JdbcBaselineBlueprintStore, legacy authoring/tests; shared stable blueprint/version registries/history | Retain all columns and checks; cannot DROP because new form no longer displays them |
| baseline_blueprint_working_revision roles/state and baseline_blueprint_version/role/skill | Legacy working/version replay/conversion, fixed readers/tests, FK registries and assessment manifest pins | Retain; no cross-format rewrite |
| baseline_assessment_series working_revision_id/pending_blueprint_version/open_assessment_version_id/active_assessment_version_id; baseline_assessment_transition; baseline_management_command; baseline_answer_reveal_audit | Fixed current/history/command/audit structures, immutable constraints, assessment_version references | Retain; no receipt/history cleanup even with0 current rows |
| baseline_adaptive_blueprint_version exploration_max_questions/exploration_time_limit_seconds; baseline_adaptive_blueprint_role max_questions/time_limit_seconds | Legacy-policy pinned snapshots and exact JSON/hash readers. V20 conditional adaptive_blueprint_scope_bounds and V21 occupation_baseline_name_time_limits support new occupation_* columns | Keep both old/new shapes; current binary dual readers mandatory; role-only old binary unsafe for new rows |
| baseline_adaptive_attempt attempt_purpose/target_role_id/target_selection_revision, scope_policy and exact technical/version/deadline fields | Legacy provenance and new full policy, allowance/REQ-001 guards; adaptive_attempt_complete, scope checks and composite pins/FKs | Retain all; no purpose relabel/rescore/reset; membership changes never alter old pool |
| assessment_version/assessment_item/assessment_attempt/assessment_result/item_response | Generic/module plus fixed-baseline consumers and cross-table references | Shared, out of destructive scope |
| question_bank/item_version/model_version/mastery_mapping_version and V18 irt_* | Official bank135 DRAFT, shared content/scoring/calibration/pinned technical readers | Retain exact content/hashes/source policy. Zero models is a readiness blocker, not permission to fabricate/delete schema |
| V23 irt_effective_parameter_selection and irt_parameter_promotion_command | New future scoped selection + immutable receipts; full20 constraints/4 custom triggers in database evidence | Retain empty schema. Never delete historical PROMOTED sets/receipt rows when switching current |

For the exhaustive exact object list, use JSON `tables[].columns/constraints/triggers/incomingForeignKeys/literalConsumers`, rather than a guessed rename/DROP list. **No removal proposal is ready for approval**: D1 real owner integration/authenticated history verification is still blocked, physical legacy files have historical test/doc consumers, and schema compatibility/history references remain. Do not ask for blanket destructive approval.

Rollback: keep new admissions/administration off, preserve all schema/history/volumes/backups, deploy only a dual-reader-compatible binary; separately verify any recovery target before restoring the readable V22 dump. No old-binary run or restore was executed. Future cleanup requires a new exact approved list plus post-integration verification and forward migration; V1–V23 are immutable.

Confirmed: exact D1 reroute/gates and preservation | Proposed: none for destructive removal | Provisional: local/demo owner dependencies | Open: real integration/executable verification/future exact cleanup approval | Rejected: DROP from name/row-count alone, deleting shared/history consumers or restoring mocks as rollback.
