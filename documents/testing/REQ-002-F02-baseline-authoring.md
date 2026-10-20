# REQ-002-F02 — Baseline blueprint authoring test plan and evidence

> **Historical V17 evidence:** this document proves the superseded counts/weights and Generate → Review → Publish implementation. It does not certify the 2026-10-20 adaptive Blueprint/Test Blueprint contract. New executable tests may be created/run only in approved Cluster 3 after Cluster 2 implementation.

## Scope and status

- Actor: L&D Manager from trusted server-side context.
- Verified product flow: select one Occupation, configure all of its roles by skill/difficulty (including zero-question roles), generate an exact assessment manifest, review its current content hash, then publish it.
- Tenant context: the current product contract is single-organization. Tests still verify that the actor organization is passed to catalog validation and that an unauthenticated or unauthorized actor is rejected before dependencies are called.
- Approval status: the user approved O6 and the original Cụm 1–4 Occupation flow, completed on 2026-10-15, plus the UX/i18n delta and linked-weight/capacity Cụm 1–4 completed on 2026-10-16. Local/demo executable evidence is current at every planned level. F02 is not production-ready because production Identity/Catalog contracts remain dependencies.

## Occupation-scoped delta — executed 2026-10-15

| Rule | Observable result | Planned level | Status |
| :--- | :--- | :--- | :--- |
| R9 | One Occupation resolves to one logical blueprint identity; later saves create immutable versions rather than another blueprint. | Unit + PostgreSQL integration | PASS |
| R10 | A saved version contains all and only current roles linked by `Occupation-[:HAS_ROLE]->TargetRole`; a missing/injected/cross-Occupation role rejects the whole write. | Unit + Neo4j/catalog integration | PASS |
| R11 | A role whose skill counts total `0` survives save/reload but causes no coverage lookup, generated item or score contribution. At least one role must be non-zero. | Unit + PostgreSQL + system | PASS |
| R12 | Role skill scope is the de-duplicated union of `TargetRole -> HAS_LEVEL -> REQUIRES_SKILL -> MicroSkill`; missing or inconsistent catalog structure is catalog-not-ready. | Neo4j/catalog integration | PASS |
| R13 | Shared role/skill/difficulty demand is aggregated against unique published question versions; generation never repeats one question version in the same assessment. | Unit + PostgreSQL integration | PASS |
| R14 | UI lists Occupations, then all roles within the selected Occupation, supports setting one role to zero, and preserves the existing save/generate/review/publish flow. | Frontend + Compose/Playwright | PASS |

R1–R8 below remain regression requirements and were replayed together with R9–R14.

## Approved acceptance rules used by the tests

| Rule | Observable result |
| :--- | :--- |
| R1 | Only a trusted active L&D actor can author; non-local/production-like access is deny-by-default. |
| R2 | Enabled roles and skills are validated against the actor's catalog scope; disabled roles are retained but skipped. Coverage shortage reports every missing difficulty and persists nothing. |
| R3 | Create/revise is versioned and immutable. Same actor/key/content replays; changed content conflicts; stale expected version conflicts. |
| R4 | Generation pins the exact blueprint version, item versions, role positions, scoring weights and content hash. API/UI never expose protected or answer-key material. |
| R5 | Same generation key replays the same draft; a new key creates a successor version; changed coverage cannot leave a partial manifest. |
| R6 | Review and publish require the exact current content hash. Review freezes the manifest and publish freezes both header and items; retries remain idempotent. |
| R7 | Flyway V1–V13 works on a clean PostgreSQL 17.6 database and rerun is a no-op. Persisted audit timestamps round-trip as UTC `timestamptz`. |
| R8 | The L&D page supports save → generate → review → publish and shows actionable coverage failures without enabling an invalid next action. |

## Test mapping

| Level | Rules | Evidence |
| :--- | :--- | :--- |
| Unit/application/API/frontend | R1–R6, R8–R14 | [Unit evidence](unit/REQ-002-F02-baseline-authoring.md) |
| PostgreSQL + Neo4j integration | R3–R7, R9–R13 | [Integration evidence](integration/REQ-002-F02-baseline-authoring.md) |
| Full Compose + browser | R3–R8, R11, R14 | [System evidence](system/REQ-002-F02-baseline-authoring.md) |

## Occupation-scoped execution summary — 2026-10-15

- Scoped backend unit/API run: **24 passed**, 0 failures/errors/skips.
- PostgreSQL V1–V13 integration: **4 passed**; Neo4j Occupation adapter: **3 passed**; corrected graph-schema regression: **1 passed**.
- Full backend regression: **174 passed**, 0 failures/errors/skips.
- Scoped frontend run: **9 passed** across 2 files; full frontend regression: **39 passed** across 10 files.
- Full-stack Compose/Playwright Occupation flow: **1 passed** in 7.8 seconds. It saved and reloaded a two-role blueprint with one zero-question role, generated 3 items only for the participating role, replayed the generation key, reviewed the exact hash and published it without exposing answer-key material.
- The disposable Compose project, network and PostgreSQL/Neo4j volumes were removed after the run.

`GraphSchemaTest` initially exposed a stale seed assertion: the current deterministic seeder creates 16 `TargetRole-[:REQUIRES_SKILL]->MicroSkill` relationships, while the assertion still expected 9. The assertion was aligned with the current seed and then passed both alone and in the 174-test regression. No graph schema or seed data was changed by that correction.

## Role-scoped execution summary — 2026-10-14

- Baseline backend suite: **21 passed**, 0 failures/errors/skips.
- Entire frontend Vitest suite: **37 passed** across 10 files; the REQ-002 additions account for 7 tests across 2 files.
- Scoped Playwright system flow: **1 passed** on the disposable full Compose stack.
- Full backend regression at that date: 164 executed, 163 passed and 1 graph-schema assertion failed because the test expected 9 role-to-skill relationships while the current seed created 16. The stale assertion was corrected and is superseded by the successful 2026-10-15 regression above.

Warnings retained for follow-up: Spring `@MockBean` deprecation and Mockito dynamic-agent warnings. They did not fail the suites.

## Remaining boundaries

- Development Catalog and L&D actor adapters are test/demo boundaries, not production Identity/Catalog integration evidence.
- The Occupation adapter is still local opt-in. Its real Neo4j traversal is integration-tested, but production tenant visibility, publication readiness and catalog snapshot ownership remain Catalog dependencies.
- Development question import data is deterministic setup, not a production oracle.
- Employee attempt, response, scoring/evidence and RIASEC flows are outside this authoring function.
- No commit or push is part of this evidence run.

## UX/i18n change — executed 2026-10-16

The user approved Cụm 2 on 2026-10-16. The frontend Function, regression and Compose/browser suites below ran against the completed Cụm 1 behavior:

| Confirmed rule | Observable result | Planned level | Status |
| :--- | :--- | :--- | :--- |
| UX1 | Applying a role total deterministically produces that exact total and balances difficulty/skill cells according to the approved rule. Repeating the same input and catalog order gives the same result. | Frontend unit/component | PASS |
| UX2 | Applying zero clears all counts/weights. A later manual cell edit updates the displayed role total without silently redistributing other cells. | Frontend component | PASS |
| UX3 | UI percentage `40` maps to API decimal `0.4`, a loaded decimal `0.4` displays as `40%`, used weights total `100%`, and unused difficulties remain `0%`. | Frontend unit/API/component | PASS |
| UX4 | Switching EN/VI translates static and dynamic baseline-authoring content without losing unsaved input or changing the request payload. | Frontend component + system | PASS |
| UX5 | Multiple role panels can remain expanded and each can be collapsed independently. | Frontend component + system | PASS |
| UX6 | Existing save/reload/generate/review/publish, coverage shortage and zero-role behavior remain compatible. | Frontend regression + system | PASS |

Execution summary:

- Scoped frontend: **16 passed** across 3 files, including the new deterministic distribution/percentage unit suite and 7 page/component cases.
- Full frontend regression: **46 passed** across 11 files in 9.71 seconds.
- Full-stack Compose/Playwright: **1 passed** in 6.7 seconds; the scenario covered explicit distribution, exact `33.34/33.33/33.33%`, EN/VI state retention, multi-open roles and the existing save/reload/generate/replay/review/publish flow.
- Production build passed; lint exited 0 with pre-existing warnings outside the changed baseline files.
- System execution exposed a legacy backend invariant that requires weights of every persisted role to total one even when the role has zero questions. The frontend boundary now sends compatibility weights `0.3334/0.3333/0.3333` only for an excluded role and normalizes them back to visible zeros on load. Generation/scoring still ignores that role because participation is derived from its zero counts.

## UX/i18n Cụm 4 completion review — 2026-10-16

- UX1–UX6 map to passing frontend Function/component/regression and Compose/browser evidence; no acceptance exception remains.
- Static source review found one frontend route/component/helper path and one backend controller/service path, with no legacy single-open role configuration still active.
- Temporary entries `TMP-REQ002-01..05` still match their files, properties and consumers. The UX delta introduced no new runtime fake, seed or conditional wiring.
- No backend, API DTO, migration or persistence file changed. Zero-role compatibility is isolated to the frontend request/editor boundary and documented as non-participating wire compatibility.
- Documentation links, conflict-marker scan, secret-pattern scan and `git diff --check` passed. Executable tests were not rerun because Cụm 3–4 changed Markdown only after the successful Cụm 2 run.

## Cụm 4 completion review — 2026-10-15

- R1–R14 are mapped to passing unit/application/API/frontend, PostgreSQL/Neo4j integration and Compose/Playwright evidence above.
- No backend/frontend/runtime code changed after the successful Cụm 2 run; subsequent worktree changes are documentation only, so executable suites were not rerun in Cụm 4.

## Linked weights and capacity-aware allocation — Cụm 2 executed 2026-10-16

The user approved Cụm 2 on 2026-10-16. Docker-backed evidence was rerun after the daemon became available, then the user authorized proceeding directly to Cụm 4 when the rerun passed.

| Rule | Executable mapping | Result |
| :--- | :--- | :--- |
| Participating weights total exactly `100%`, use at most `0.01%` precision and satisfy `Hard > Medium > Easy >= 1%`. Invalid raw values such as `040` remain visible and block commit. | `baselineBlueprintWeights.test.ts`, `BaselineWeightControl.test.tsx`, `BaselineBlueprintServiceTest` | PASS |
| Input and accessible slider share state; divider movement clamps at the nearest valid hierarchy boundary. A zero-question role keeps visible weights at zero. | `BaselineWeightControl.test.tsx` | PASS |
| A participating role allocates at least one Easy, Medium and Hard question for every MicroSkill; total is `0` or within `[3 × N, feasibleMax]`. | `baselineBlueprintCapacity.test.ts`, `BaselineBlueprintPage.test.tsx`, `BaselineBlueprintServiceTest` | PASS |
| Shared MicroSkill demand is aggregated by difficulty and cannot exceed current published capacity. | `baselineBlueprintCapacity.test.ts`, `OccupationBaselineBlueprintPolicyTest` | PASS |
| Capacity read uses trusted actor organization, unique occupation skills, stable API errors and exposes counts/metadata without protected answer material. | `BaselineBlueprintCapacityServiceTest`, `BaselineOccupationCatalogControllerTest`, `baselineBlueprintApi.test.ts` | PASS |
| PostgreSQL capacity counts only the latest published item version; full UI save/generate/review/publish follows the new minimum and `20/30/50` default. | `BaselineAssessmentPostgresIntegrationTest`, `REQ-002-F02-baseline-authoring.spec.ts` | PASS |

Execution evidence:

- Backend scoped unit/API: **18 passed**, 0 failures/errors/skips across four classes.
- Initial non-Docker regression while the daemon was unavailable: **177 executed, 162 passed and 15 skipped**, 0 failures/errors. This provisional evidence is superseded by the final Docker-enabled regression below.
- Docker-enabled scoped integration command `mvnw.cmd -q "-Dtest=BaselineAssessmentPostgresIntegrationTest,Neo4jBaselineOccupationCatalogAdapterIntegrationTest,GraphSchemaTest" test` exited **0**. PostgreSQL capacity used PostgreSQL 17.6 with Flyway V1–V13; Neo4j adapter/schema cases used Neo4j 5.26 Testcontainers.
- Final full backend regression `mvnw.cmd -q test`: **183/183 passed**, 0 failures/errors/skips.
- Frontend scoped Function/component/API/page coverage: **36 passed** across 5 files, including capacity retry with unsaved-draft retention.
- Full frontend regression: `npm.cmd test -- --run` — **69 passed** across 14 files.
- Frontend production build passed. Full lint exited 0; warnings are pre-existing and outside the changed baseline files.
- Clean Compose/Playwright rerun: **1/1 passed** in 9.9 seconds (scenario body 8.6 seconds). PostgreSQL, Neo4j and API were healthy, migration exited 0, and the catalog bridge returned five Platform skills before execution.
- Static completion checks passed: no unmerged/conflict markers, relative links in changed Markdown resolve, and `git diff --check` is clean in both repositories.
- Legacy `TargetRoleCatalogPort` compatibility remains available to other consumers, but new Occupation blueprint drafts route through `BaselineOccupationCatalogPort`; there is one controller/service/adapter path for the new command flow.
- Rollback is configuration-first: leave `BASELINE_OCCUPATION_CATALOG_ENABLED=false` to disable the local adapter. V13 is forward-only and must not be edited or rolled back by deleting history; legacy-null identities remain compatible.
- The historical walkthrough was retired after the management route and whole-integer UI replaced its legacy steps; this document retains canonical execution evidence.

## Linked weights/capacity Cụm 4 completion review — 2026-10-16

- Every accepted linked-weight, minimum-per-skill/difficulty, aggregate-capacity, stale-save and full authoring-flow rule maps to current executable evidence; no local/demo acceptance exception remains.
- Static review confirms one capacity controller/use-case path, one frontend capacity client/policy/control path, and no competing command handler or legacy native-number weight editor.
- Temporary entries `TMP-REQ002-01..05` still match the local actor, seed, catalog adapter and frontend consumers. No new fake capacity or client-side production source of truth was introduced.
- Compatibility remains deliberate: excluded roles are represented by zero counts, immutable historical blueprint versions remain readable, and V13 stays forward-only. Rollback remains configuration-first by disabling the local Occupation adapter outside approved profiles.
- Production Identity authorization, tenant-safe Catalog visibility, publication readiness and catalog snapshot/release ownership remain deferred to their owners. Therefore completion here means the approved local/demo Function delta, not production readiness.
- `git diff --check`, conflict-marker scan, changed-document relative-link check and implementation/registry call-site review passed. No runtime code changed after the successful Docker-enabled Cụm 2 rerun, so executable suites were not repeated after these Cụm 4 Markdown updates.
- Changes remain uncommitted and unpushed; commit grouping requires a separate user instruction.

## Baseline Assessment Management — Cluster 2 partial evidence — 2026-10-17

Function: `REQ-002-F02`. Actor/tenant fixture for the new backend cases is an active `LD_MANAGER` in a fixed organization; negative fixtures cover unauthenticated, inactive, wrong-role, denied reveal and cross-tenant lookup. Frontend fixtures use deterministic management payloads and no local lifecycle source of truth.

| Acceptance/risk | Trigger and expected result | Executable mapping | Result |
| :--- | :--- | :--- | :--- |
| AC-04/05/06/08/10/11 lifecycle cardinality | Start/edit/review/publish/restore decisions reject a second pending chain, stale edit, reviewed mutation, draft publish and active restore; projections distinguish active/draft/history. | `BaselineAssessmentLifecycleTest` | PASS |
| AC-13 trusted actor and isolation | Missing/inactive/wrong-role actors are rejected before dependencies; assessment lookup uses trusted organization and does not fall through on cross-tenant absence. | `BaselineAssessmentManagementServiceTest`, `BaselineAnswerReviewServiceTest` | PASS |
| AC-02/07/15 API safety | Landing query is forwarded; stale revision maps to `409`; normal detail omits protected key, actor and generation seed. Reveal uses a dedicated JSON response with `no-store`. | `BaselineAssessmentManagementControllerTest`, `BaselineAnswerReviewControllerTest` | PASS |
| AC-03/15/16 frontend compatibility | Filters are encoded, server errors retain codes, reveal calls only the no-store endpoint, answer rendering is opt-in, item reorder is deterministic, and old routes redirect to persistent management URLs. | `baselineAssessmentManagementApi.test.ts`, `AssessmentManifestEditor.test.tsx`, `LegacyBaselineAssessmentRedirect.test.tsx` | PASS |
| Architecture/atomic boundary | Application core must not depend on Spring. Management writes run through an infrastructure transaction wrapper; reveal read+audit is transactional in the JDBC adapter. | `HexagonalArchitectureTest` plus scoped REQ-002 suites | PASS |
| AC-06/10/13/14 PostgreSQL V1-V16, uniqueness, cross-tenant reveal and audit | Disposable PostgreSQL must migrate through V16, reject invalid cardinality/tenant state and append one reveal audit. | `BaselineAssessmentPostgresIntegrationTest` including `answerRevealIsTenantScopedAndAppendsOneAuditRow` | NOT RUN — 6/6 skipped because Docker Linux engine was unavailable |
| AC-03/09/10/11/12 system lifecycle | Run management → revision → generate → reload → edit → review → publish, then successor/restore/disable on disposable Compose. | Playwright REQ-002-F02 system flow | NOT RUN — Docker Linux engine unavailable |

Executed commands and outcomes:

- Scoped backend domain/application/API/architecture/production-boundary command: **21/21 passed**; management application and API additions each contributed **3/3 passed**.
- Backend regression excluding the six explicitly Docker-dependent classes: `mvnw.cmd "-Dtest=*Test,!BaselineAssessmentPostgresIntegrationTest,!Neo4jBaselineOccupationCatalogAdapterIntegrationTest,!TargetRoleAndMicroSkillNeo4jIntegrationTest,!Neo4jTargetRoleCatalogAdapterTest,!DatabaseSchemaTest,!GraphSchemaTest" test` — **186 run, 0 failures, 0 errors, 7 skipped**, exit 0.
- Unfiltered backend `mvnw.cmd test` exposed the original application-layer transaction dependency plus four Docker environment errors. The architecture defect was fixed and its focused rerun passed; Docker failures remain environmental and the unfiltered suite is therefore not recorded as passed.
- Frontend `npm.cmd test -- --run` — **17 files, 76/76 passed**, exit 0. The first run caught missing Router context in the retained legacy page test and an incorrect accessibility-label expectation; both tests were corrected before the successful full rerun.
- Frontend production build (`npm.cmd run build`) passed with TypeScript checking and 2,036 transformed modules; only the existing large-chunk advisory remained.
- Testcontainers probe for `BaselineAssessmentPostgresIntegrationTest` — Maven exited 0 only because **all 6 tests were skipped** after Testcontainers reported no valid Docker environment. This is not integration evidence.

Environment: Windows workspace, Java 21.0.12, Spring Boot 3.5.16, Vitest 5.0.2. The user approved Cluster 2 with Docker-backed PostgreSQL/concurrency and disposable Compose/Playwright evidence explicitly deferred, then authorized Cluster 3. Documentation synchronization does not convert those gaps into passes; they remain required follow-up evidence.

## Baseline Assessment Management — Cluster 4 review finding — 2026-10-17

Static full-context security review found a blocking gap not covered by the passing controller slices. `LocalCatalogSecurityConfiguration` matches `/api/v1/ld/baseline-blueprints/**` but not `/api/v1/ld/baseline-assessments/**`. In the complete local application, management and answer-review requests therefore fall through to `SecurityConfiguration.anyRequest().denyAll()`; POST/PUT requests also lack the CSRF exemption expected by the current frontend client. The controller tests import only the local chain, so their passing result does not prove full-chain route availability.

Result: **Cluster 4 review completed with an explicitly deferred defect**. The user chose to retain this finding for later correction. Before claiming executable local management, add the new path to the local matcher, GET/POST/PUT authorization and CSRF ignore list; add a full security-chain regression proving local/demo availability and starter-profile denial; rerun affected backend coverage. No production code or executable test was changed or run during this review. The Docker-backed gaps above remain separate and unchanged.

## 2026-10-19 corrective verification (manual/build only)

Before the Cluster 2 rerun below, manual POST created a working revision (201), GET reloaded it, and read-only API smoke returned Blueprint v1 (two roles, ten skills) and Reviewed assessment v1 (50 items). Flyway applied V17. These were manual observations, not executable test evidence. The local migration process later failed on a separate legacy Neo4j seeder guard after V17 committed.

## Corrective Cluster 2 — 2026-10-19

| Function rule | Actor/tenant and trigger | File/method | Result |
| :--- | :--- | :--- | :--- |
| Whole-number weights total 100 and keep the previous committed field | L&D enters Hard 40, then Medium 35; Easy becomes 25; decimal or non-hierarchical edits fail | `baselineBlueprintWeights.test.ts`, `BaselineWeightControl.test.tsx` | PASS |
| Working revision omits a derived total without breaking reload; inconsistent total fails | L&D GET workspace; skill counts 1/1/1 | `baselineAssessmentManagementApi.test.ts` | PASS |
| Save stays in editor; Finalize shows Generate CTA; candidate list retains CTA; details show skill counts | L&D current Occupation, saved/candidate Blueprint | `BlueprintRevisionPage.test.tsx`, `BlueprintVersionsView.test.tsx` | PASS |
| Save/Finalize/Generate send expected revision and idempotency keys | L&D command sequence | `baselineAssessmentManagementApi.test.ts` | PASS |
| Local matcher admits management GET/POST/PUT without CSRF; starter denies management | local vs starter profile with both local/default chains | `BaselineManagementSecurityChainTest`, `BaselineBlueprintProductionBoundaryTest` | PASS |
| V17 migrates once; working and transition triggers read their respective actor fields; cross-organization actor update rolls back | disposable PostgreSQL 17.6, trusted L&D actor and wrong-organization actor | `BaselineAssessmentPostgresIntegrationTest` | PASS |

Commands: frontend `npm.cmd test -- --run` (19 files, **83/83 passed**) and `npm.cmd run build` (TypeScript/build pass, 2,036 modules); backend `mvnw.cmd -q "-Dtest=BaselineManagementSecurityChainTest,BaselineBlueprintProductionBoundaryTest,BaselineAssessmentManagementControllerTest,BaselineAssessmentManagementServiceTest,BaselineAssessmentLifecycleTest,BaselineBlueprintControllerTest,BaselineAssessmentDraftServiceTest,BaselineAnswerReviewControllerTest,BaselineAnswerReviewServiceTest" test` (**31/31 passed**) plus `mvnw.cmd "-Dtest=BaselineManagementSecurityChainTest,BaselineBlueprintProductionBoundaryTest,BaselineAssessmentPostgresIntegrationTest" test` (**7/7 PostgreSQL integration passed**; first security fixture returned 404, corrected by importing its controller, then scoped security rerun passed). The trigger case was rerun after adding the cross-tenant assertion and passed. No cases were skipped in these runs. Environment: Windows, Java 21, Docker Desktop, one disposable PostgreSQL 17.6 Testcontainer; development Compose volumes were not used.

Current management Compose/Playwright Save → Publish lifecycle, broader concurrent command serialization, desktop/mobile visual review and production Identity/Catalog integrations remain open. Prior historical slider and legacy-route results are not evidence for those gaps.

The subsequent full backend command `backend/mvnw.cmd -q test` completed with **204/204 passed, 0 failures/errors/skips** across 45 test classes, including PostgreSQL and Neo4j Testcontainers. It confirms regression compatibility of the changed backend with the current suite; it does not add the still-missing concurrency or management browser scenario.
