# RQ3 preparation, 2026-11-25

> **Reading order.** The sections below are chronological and kept as history. The current state is the last section, *Run r2 with runtime parity*. The *Preparation*, *Benchmark page* and *Follow-up* sections describe states before any simulation. The *Completed RQ3 Execution* section reports run r1, which is superseded because its A0 policy reimplemented supplementation inside the runner.

## Preparation (historical)

- Draft cohort: 100 distinct synthetic Application Developer profiles selected from development, 34 Junior / 33 Middle / 33 Senior. No Gold50 IDs. Rebuild with the same seed matched both output files byte for byte. See [manifest](../../../data/rq3/pilot-v0.1/manifest.json).
- Distance uses the runtime requirement proof key (skill, level, version). Compatible official evidence for an external prerequisite does not change the target denominator. A baseline pass and a resolved pathway step without official evidence do not count.
- Unit / component boundary: `mvn -o -q -f backend/pom.xml -Dtest=Rq3DistanceTest,WF05RuleDomainTest,SharedSkillScopeHttpTest test` passed (17 tests).
- Runtime parity: `WF05SkillOutcomePersistenceTest` started isolated PostgreSQL. The first run failed before test bodies with `UnknownEntityException: OrganizationRegistrationEntity` during application context initialization. A sequential rerun passed context startup but all three cases stopped in fixture setup with ASSESSMENT_HISTORY_UNAVAILABLE. The fixtures now bind the same assessment-history repository as production. The updated integration cases have not been verified.
- Open rule: verify when compatible reassessment transitions an existing supplemental step to ASSESSED_SATISFIED. An earlier failed attempt remains immutable, and a resolution without official evidence still does not reduce RQ3 distance. Do not freeze the simulator until this transition and the remaining protocol branches have runtime evidence.
- Status: inputs and distance ready for pilot development. No simulation run, comparison result, UI, or Playwright evidence yet.

## Benchmark page (historical, before simulation)

Platform Admin route: `/platform-admin/rq3-benchmark`. The UI presents the pilot settings and official-evidence distance definition. Run is disabled pending runtime parity and the simulator. No results are displayed before execution.

Chrome/Playwright passed on the isolated frontend harness at 1280×720 and 390×844. Verified the Platform Admin sidebar link, budget checkpoints and disabled Run state. The authenticated 8088 route was not exercised in this check. Focused frontend lint passed.

The latest WF05 integration run with the history repository reached all three fixture setups. All three failed before their test scenarios at the initial pathway setup assertion (`Expected false but was true`). Runtime parity remains unverified.

### Follow-up during manuscript preparation

The integration fixture now separates its initial baseline target (A) from the prerequisite (B) revealed later in a skill assessment. The rerun reached the scenario assertions. All three cases remain unverified: retry scope and supplementary pathway assertions failed, and the prior-official case produced no expected review record. No RQ3 simulation results were generated. These failures are observations from the test fixture, not proof that production behaves the same way.


---

## Run r1 execution (superseded by r2) — 2026-11-25

> Superseded. r1's A0 called `RuleAssessmentDecision.decide` but added supplements with its own logic, not the runtime recalculation transition. Its test also overwrote the result file and asserted that A0 beats S0. Numbers below are kept for history only.

### 1. Runtime Parity & Policy Resolution
- Following the merge of `main` (`07bf64b9`) into `RQ1-and-RQ3`, the runtime rule for supplementary prerequisite learning is explicitly enforced in `RequirementPathwayPlanningService`, `RequirementPathwayRecalculationService`, and `RuleAssessmentDecision`: once a failed prerequisite group (without prior official evidence) assigns supplementary prerequisite learning, a later retake of the main skill does not clear that assigned learning until official achievement evidence for the prerequisite is earned.
- **Actual Command**:
  `mvn -o -f backend/pom.xml -Dtest=Rq3DistanceTest,WF05RuleDomainTest,SharedSkillScopeHttpTest,WF05SkillOutcomePersistenceTest test`
- **Actual Outcome**: **PASSED** (`22 tests run, 0 failures, 0 errors`: `Rq3DistanceTest` 2/2, `SharedSkillScopeHttpTest` 3/3, `WF05RuleDomainTest` 13/13, `WF05SkillOutcomePersistenceTest` 4/4 on PostgreSQL 17.6 Testcontainers).

### 2. Deterministic 100-Profile × 30-Replicate RQ3 Simulation
- **Runner & Test**: `com.adaptlearngraph.research.Rq3SimulationRunner` & `Rq3SimulationRunnerTest`.
- **Actual Command**:
  `mvn -o -f backend/pom.xml -Dtest=Rq3DistanceTest,Rq3SimulationRunnerTest test`
- **Actual Outcome**: **PASSED** (`3 tests run, 0 failures, 0 errors`). Re-executing `runFullExperiment(20261125L, 30, SimParams.defaults())` produced identical outputs across runs and wrote the immutable report to [../../../results/rq3/20261125-r1-superseded/report.json](../../../results/rq3/20261125-r1-superseded/report.json).
- **Summary Metrics (`100 profiles × 30 replicates`, `budget = 40`, checkpoints `0/10/20/30/40`)**:
  - `S0` (Primary Static) Target Distance $D(u, b)$: `0.7067` (0) → `0.6792` (10) → `0.6541` (20) → `0.6322` (30) → `0.6128` (40).
  - `A0` (Adaptive Recalculation) Target Distance $D(u, b)$: `0.7067` (0) → `0.6712` (10) → `0.6333` (20) → `0.5982` (30) → `0.5692` (40).
  - `S1` (Upfront Prerequisite Static) Target Distance $D(u, b)$: `0.7067` (0) → `0.6605` (10) → `0.6186` (20) → `0.5834` (30) → `0.5565` (40).
  - Mean Paired Target Distance Gain $\Delta D(40) = D_{\text{S0}}(40) - D_{\text{A0}}(40) = +0.0436$ (95% bootstrap CI `[+0.0349, +0.0531]`, `SE = 0.0047`; `A0` wins on 72 profiles, ties on 27, loses on 1).
  - Mean Paired Initial Mandatory Gap Gain $\Delta D_{\text{gap}}(40) = +0.0717$ (95% bootstrap CI `[+0.0511, +0.0940]`, `SE = 0.0108`; `S0` `0.2616` vs `A0` `0.1899`).
  - Pathway Release Rate at Budget 40: `49.40%` (`S0`) vs `62.03%` (`A0`).
  - Control Stratum (`25 profiles with all prerequisites already achieved`): `S0`, `A0`, and `S1` yielded identical final distance (`0.4351`, $\Delta D = 0.0000$, release rate `95.33%`).

### 3. Frontend Unit, TypeScript & Playwright E2E Verification
- **Vitest Unit & Component Tests**:
  - Command: `npm --prefix frontend test -- --run src/features/platform-admin/rq3BenchmarkEngine.test.ts src/features/platform-admin/PlatformRq3BenchmarkPage.test.tsx`
  - Result: **PASSED** (`2 test files, 4 tests passed`).
- **TypeScript Strict Compilation**:
  - Command: `npx --prefix frontend tsc -b frontend/tsconfig.app.json`
  - Result: **PASSED** (`0 errors`).
- **Playwright E2E Browser Verification**:
  - Command: `PLAYWRIGHT_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" SYSTEM_TEST_BASE_URL="http://127.0.0.1:4183" RQ3_REVIEW_PAGE="http://127.0.0.1:4183/rq3-review.html" npx --prefix frontend playwright test --config=frontend/playwright.system.config.ts frontend/system-tests/REQ-RQ3-pathway-efficiency-benchmark.spec.ts`
  - Result: **PASSED** (`1 passed`, verified checkpoint trajectory table `0/10/20/30/40`, interactive simulation re-run, strata & sensitivity grid tab, 100-profile trajectory inspector with empty-filter recovery, desktop `1280×720` and mobile `390×844` viewports, `0` console/page errors, `0` failed fixture requests).

### 4. Manual Verification Checklist (`/platform-admin/rq3-benchmark`)
1. Sign in as Platform Administrator (`platform.admin@adaptlearngraph.com`) and navigate to `/platform-admin/rq3-benchmark`.
2. Verify the 4 KPI summary cards (`100 × 30`, `+0.0436`, `+0.0717`, `72 / 27 / 1`) and the 5-checkpoint trajectory table (`0, 10, 20, 30, 40` units).
3. Click **Chạy lại thực nghiệm (30 lần lặp)** (`Re-run simulation (30 replicates)`) and confirm the toast and verification badge update.
4. Open Tab 2 (**2. Phân tầng & Độ nhạy**) and verify the Prerequisite Exposure Control table (`HAS_UNACHIEVED_PREREQUISITES` vs `ALL_PREREQUISITES_ALREADY_ACHIEVED`), Role Level / Gap Band / Evidence History tables, and the 5-row Sensitivity Grid.
5. Open Tab 3 (**3. Tra cứu 100 Hồ sơ Học viên**), filter by Role Level or Gap Band, click individual profiles to inspect their checkpoint trajectories, and test **Xuất CSV (100 hồ sơ)** / **Xuất JSON**.


---

## Run r2 with runtime parity — 2026-11-25

### Changes
- **Runtime transitions extracted, behavior unchanged.** `RequirementPathwayRecalculationService.supplement` (static) now holds the supplementation and dependency logic that `assessed()` applied in place before. `RequirementPathwayPlanningService.refreshedStep` (static) holds the per-step merge that `refresh()` applied before. The persisted job calls both.
- **Runner.** All policies walk a real `RequirementPathway.Plan` and refresh it through `RequirementPathwayGenerationService.step` + `refreshedStep`. Only A0 applies `supplement` after each skill assessment. S1's upfront order is a static plan with synthetic dependency provenance. The catalog snapshot is built from `teaching-bindings.json` and `modules.json`. Shared selection rule: round-robin over the current plan order.
- **Artifacts** in `results/rq3/20261125-r2-runtime-parity/`: `report.json`, `events.jsonl.gz` (265,904 policy-facing events: action, cost, observed group results, decision, evidence added, supplements, plan revision hash, D before/after, stop reason, remaining budget), `hidden-state.jsonl.gz` (256,904 evaluator-only events: z before/after, correctness probability, draws), `run-manifest.json` (git commit `07bf64b9` plus uncommitted working tree, SHA-256 of 8 engine sources and 5 inputs, runtime 254 s) and `SHA256SUMS.txt`.
- **Secondary outcomes** added: D = 0 rate, gap closure with right-censoring and restricted mean cost, paired complete-case cost, retakes, failed attempts, remedial requirements, assigned modules, review events and stop reasons.
- **Sensitivity** extended to assessment cost 0.5/1/2, horizon 20/40/80 and an equal-initial-knowledge control, with bootstrap CIs per row (10 configurations).
- **Tests** no longer write artifacts or assert a winner. Artifacts come only from `Rq3SimulationRunner.main`.

### Commands and actual results (macOS, JDK 24, Docker 29.2.0)
| Level | Command | Result |
|---|---|---|
| Unit: runtime transitions and simulator invariants | `mvn -B -Dtest='Rq3*Test,WF05RuleDomainTest,LayeredArchitectureTest' test` | `Rq3DistanceTest` 2/2, `Rq3RuntimeTransitionTest` 7/7, `Rq3SimulationRunnerTest` 6/6, `WF05RuleDomainTest` 13/13 passed. `LayeredArchitectureTest`: 7/9 passed, 2 failed (`webDoesNotDependOnEntitiesOrRepositories`, `webSignaturesUseNoEntities`) on classes in `apis` (`DemoCheckpointController`, `BaselineQuestionRequestController`, `CertificateAuthoringController`, `RuleAssessmentController`) that this change did not touch. |
| Integration (Testcontainers PostgreSQL) | `mvn -B -Dtest='WF05SkillOutcomePersistenceTest,SharedSkillScopeHttpTest' test` | 4/4 and 3/3 passed. |
| Integration, other pathway owners | `mvn -B -Dtest='WF05CertificatePersistenceTest,WF05CommitmentWorkflowTest,WF05KnowledgeContextTest,WF05PathwayPersistenceTest' test` | 4/4, 1/1, 3/3 and 8/8 passed. |
| Simulation run | `java -cp target/classes:<maven classpath> com.adaptlearngraph.research.Rq3SimulationRunner .. 07bf64b9` | Wrote r2 artifacts. |
| Frontend unit/component | `npm --prefix frontend test -- --run src/features/platform-admin/rq3BenchmarkEngine.test.ts src/features/platform-admin/PlatformRq3BenchmarkPage.test.tsx` | 2 files, 6 tests passed. |
| Type check and lint | `npx tsc -b tsconfig.app.json`, `npx oxlint --deny-warnings src/features/platform-admin/ system-tests/REQ-RQ3-pathway-efficiency-benchmark.spec.ts` | 0 errors, 0 warnings. |
| Playwright (isolated harness, port 4183) | `node documents/research/tools/serve_rq3_browser_review.mjs`, then `RQ3_REVIEW_PAGE=http://127.0.0.1:4183/rq3-review.html npx --prefix frontend playwright test --config=frontend/playwright.system.config.ts frontend/system-tests/REQ-RQ3-pathway-efficiency-benchmark.spec.ts` | 1 passed (desktop and 390×844 mobile, secondary outcomes and 10-row sensitivity table visible, 0 page errors). The authenticated `/platform-admin/rq3-benchmark` route on the full stack was not exercised. |

### Results summary
ΔD(40) S0 − A0 = +0.0427 [+0.0342, +0.0520]. ΔD(40) S1 − A0 = −0.0136 [−0.0177, −0.0098]. ΔD_gap(40) = +0.0695. Release rates 49.40% / 61.83% / 64.40% (S0 / A0 / S1). No run reached D = 0. Full tables are in the [protocol](../../../RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md).

### Still open
- Independent expert review of the simulator, rubric and prerequisite relations. No review identity or timestamp is recorded, because none exists.
- The cohort manifest stays `DRAFT_PILOT_INPUTS`.
- `RESEARCH_MANUSCRIPT.docx` was not regenerated in this pass.
