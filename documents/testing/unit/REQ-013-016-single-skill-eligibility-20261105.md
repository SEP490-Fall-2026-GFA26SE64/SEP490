# Single-Skill Module / learning eligibility — unit and component checks, 2026-11-05

Scope: FR-05.05 / legacy REQ-013, REQ-016 and learning prerequisite subset of FR-06.08. Skill Assessment execution/scoring/mastery is owned separately. No new product requirement ID. [Technical/API contract](../../technical/Skill-Learning-Eligibility.md).

## Backend

Java 21.0.7; Maven wrapper invoked with `bash` because the checked-in wrapper is not executable on this host. Mockito 5.17 is supplied with `-DargLine=-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar` for this run; no project dependency or test policy was changed. Initial default Java 24/self-attach attempts failed in the sandbox before assertions; the explicit-agent runs succeeded.

Final distinct selected classes (no repeat-run addition):

| Class | Tests | Behavior |
| --- | ---: | --- |
| SkillLearningServiceTest | 10 | Explicit unmet proof/null, 1-of-N completion, optional study before/after qualification, tenant/learner/role denial, original Skill provenance, actual completion time, partial denial and truthful pinned-version display |
| SingleSkillImportTest | 2 | Real POI template/preview uses only one skillId; multi-Skill import fails before Module mutation |
| SingleSkillPlanningTest | 2 | New policy requires no focus/difficulty, preserves cost ordering and rejects multiple targets |
| SingleSkillTemplateTest | 3 | Real new template/closure preserves one target; workspace import rejects multi-target/retired metadata |
| PlatformCatalogServiceTest | 7 | Existing closure/catalog behavior |
| ModuleAuthoringServiceTest | 16 | Existing ownership/review/history/concurrency rules with one-Skill authoring |
| ModuleAuthoringMappingsTest | 5 | DTO mappings, nullable metadata and new wire shape |
| LearningContentServiceTest | 11 | Existing authorized content/progress/version/media safeguards |
| InitialProblemBuilderTest | 4 | Existing gate/version/readiness policy safeguards |
| InitialPlanValidatorTest | 9 | Existing prerequisite/review validation and historical teaching compatibility |
| LayeredArchitectureTest | 9 | Existing package boundaries |
| ModuleSessionSecurityTest | 11 | Real security-filter/session/CSRF/entitlement boundary |

**89 distinct backend unit/API/architecture tests passed**, 0 final failures/errors/skips in the selected classes. Commands used the named `-Dtest=` sets above; latest `SkillLearningServiceTest` was rerun for the pinned-version assertion and is counted once. Integration tests are recorded separately, not included in 89. Exact JUnit XML receipts are preserved in [reports](../system/assets/single-skill-learning-20261105/reports/).

## Frontend

`npm --prefix frontend test -- src/features/employee/modules/SkillLearningPanel.test.tsx src/features/expert/modules/ModuleManagementWorkspace.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/features/employee/pathway/AdaptivePathwayPage.test.tsx src/shared/api/initialPathway.test.ts --maxWorkers=1`

**43 passed / 5 files**, 0 final failures. New panel checks unmet/met proof, optional study before/after qualification, admission failure without navigation, retry and genuine empty alternatives. Existing forms/reader/pathway adapters were updated for the new contract; stale assertions for removed Primary/difficulty and old button-versus-tab roles were corrected without changing the product's tab behavior.

`npm --prefix frontend run build` passed. Existing chunk-size advisory remains. `npm --prefix frontend run lint` passed with existing repository warnings; the new panel uses keyed async state and introduces no synchronous set-state-in-effect warning.

## Dataset

`python3 -m unittest discover -s documents/dataset/import -p test_single_skill_catalog.py`: **3 passed**. Release content/hash audit, 246 exact Module mappings, forward/idempotent migration plan, refusal of drift/authored graphs without mutation.

`python3 documents/dataset/import/validate_single_skill_catalog.py` and `python3 documents/dataset/import/import_neo4j.py --dry-run`: Passed. 994 nodes, 4,703 relationships, 246 TEACHES, 71 covered / 8 uncovered Skills; audit contains the missing IDs. Retained 0.11 file and original content are not rewritten.

## Earlier failed runs retained

- Mockito self-attach initialization failed before assertions; explicit Java 21/javaagent resolved it.
- Original assertions expected two teaching targets/Primary metadata and version 0.11; they failed after the intentional contract change. Tests now assert singleton mapping, version 0.12 and absent/null retired active metadata.
- First frontend run: 29 passed / 8 failed; remaining legacy label expectations and tab roles were corrected. A subsequent run had one remaining expectation for removed Low metadata; corrected to assert absence.
- A parallel 43-case run hit two existing 5-second test timeouts under simultaneous Docker/Maven/Chrome load. The same assertions passed using one Vitest worker; no timeout or assertion was weakened. The one-worker result is the final result.

Actual logs and system screenshots are linked by the [system receipt](../system/REQ-013-016-single-skill-eligibility-20261105.md). These tests certify this local slice, not production provisioning or the teammate's assessment implementation.
