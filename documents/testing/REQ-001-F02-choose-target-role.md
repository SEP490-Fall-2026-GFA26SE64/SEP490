# REQ-001-F02 Choose Target Role — Test Plan

**Status:** Clusters 2–4 complete/pass and evidence synchronized 2026-10-02; production owner-adapter gate remains
**Gate:** Approved by the user on 2026-10-02

| Level | Required coverage |
| --- | --- |
| Unit/function | Initial/change/no-op policy; input and idempotency validation; GET empty/current and PUT response mapping; frontend parser, active/same-role state, active-summary loading/error/empty/current states, initial/change confirmation, Cancel/no-mutate, pending double-submit lock, prepared-command key reuse and error presentation; prove the routed F02 page does not call the legacy selection handler or synchronize selection into localStorage; replay preserves the original `changed` value; stale expected selection; active-assessment block; HTTP 400/401/403/404/409/503 mapping |
| Integration | PostgreSQL transaction, unique active row, request replay/hash conflict, snapshot, revision, audit/outbox atomicity and payload v1, concurrent commands, rollback on pathway/catalog failure |
| Contract | F01 actor UUID mapping; trusted organization availability recheck; current-release reference resolution; malformed/mismatched/missing/ambiguous catalog dependency; assessment/pathway ports; configured assessment block/allow; provisional pathway archive/no-pathway/mismatched-selection behavior; real owner adapters when delivered |
| System | Approved local stack: GET `204`/current and PUT `200`, required idempotency, confirm/cancel, same-role retry, unavailable role, stale/competing changes, dependency failure/recovery, and configured assessment guard. Cross-tenant principals, real Identity/Catalog adapters, and production-like deny remain owner-adapter gates; lower-level executable tests cover their current boundaries. |
| Regression | F01 browse/detail and the routed server-backed F02 page. `TargetRoleSelector`, `NotificationDropdown`, employee overview, assessment, gap, and pathway consumers remain explicit downstream follow-ups for their owning Functions, not Cluster 2 pass criteria. |

## Existing frontend regression baseline

- `TargetRoleBrowsePanel.test.tsx` predated P11–P13; Cluster 2 updated its selection query/mutation setup while preserving the F01 browse/detail assertions.
- That F01 test remains regression evidence, not a substitute for the dedicated F02 selection tests.
- Selection errors have one page-level presentation in `ActiveTargetRoleSummary`; the browse panel consumes the same query only to disable unsafe choose actions.

## Fixtures and expected invariants

- Integration fixtures use two organizations and explicit selection states. The local full-system fixture uses one configured employee/organization and two deterministic selectable roles; the Playwright setup handles both GET `204` and an existing current selection.
- Deterministic idempotency keys and request hashes; the local cross-store seed has stable IDs and remains setup data only, never the production oracle.
- Every scenario records actor/tenant, input, expected response/state, test method, command, date, and result.
- Tests must prove: one active selection, exactly-once revision/event, no cross-tenant disclosure, immutable snapshot, and full rollback on failure.

## Dependency rerun

After real Auth, Catalog, assessment-activity, and pathway adapters replace provisional ones, rerun contract, authorization/tenant, PostgreSQL integration, full system, and regression suites before marking F02 complete.

The same recheck is required when a related Function owned by this team finalizes or changes status/contract. Assessment lifecycle, gap, pathway, catalog, Auth, and notification completion must trigger a review of F01/F02 ports, provisional adapters, UI assumptions, documentation, and affected tests; do not treat the current local/demo boundary as automatically compatible.

## Execution evidence

| Date | Slice | Command | Result | Coverage |
| --- | --- | --- | --- | --- |
| 2026-10-02 | T1 domain/command/hash | `.\mvnw.cmd "-Dtest=TargetRoleSelectionDomainTest,SelectionRequestHasherTest" test` | PASS — 8 tests, 0 failures/errors/skips | Snapshot/selection invariants, active/end lifecycle, initial/no-op/change decision, command validation, canonical SHA-256 and idempotency-key exclusion from the request hash |
| 2026-10-02 | T2 application policy/replay | `.\mvnw.cmd "-Dtest=TargetRoleSelectionServiceTest" test` | PASS — 15 tests, 0 failures/errors/skips | Trusted actor/tenant, catalog recheck, initial/change/no-op, expected/stale selection, assessment guard, replay/conflict/pending and dependency failure |
| 2026-10-02 | T1+T2 regression | `.\mvnw.cmd "-Dtest=TargetRoleSelectionDomainTest,SelectionRequestHasherTest,TargetRoleSelectionServiceTest" test` | PASS — 23 tests, 0 failures/errors/skips | All executable T1 and T2 unit cases; no full backend regression, container or system coverage |
| 2026-10-02 | T3 HTTP/security | `.\mvnw.cmd "-Dtest=TargetRoleSelectionControllerTest,TargetRoleSelectionProductionBoundaryTest" test` | PASS — 16 tests, 0 failures/errors/skips | GET/PUT contract, validation, response/error mapping, local-only permit/CSRF exception and production deny-by-default |
| 2026-10-02 | T1–T3 regression | `.\mvnw.cmd "-Dtest=TargetRoleSelectionDomainTest,SelectionRequestHasherTest,TargetRoleSelectionServiceTest,TargetRoleSelectionControllerTest,TargetRoleSelectionProductionBoundaryTest" test` | PASS — 39 tests, 0 failures/errors/skips | All executable T1–T3 cases; no full backend regression, container or system coverage |
| 2026-10-02 | T4 PostgreSQL/dependency | `.\mvnw.cmd "-Dtest=TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | **BLOCKED** — 7 tests discovered, 1 passed, 6 skipped, 0 failures/errors | Assessment configured-adapter contract passed; PostgreSQL/Testcontainers cases compiled but did not execute because Docker environment was unavailable |
| 2026-10-02 | Post-T4 T1–T3 regression | `.\mvnw.cmd "-Dtest=TargetRoleSelectionDomainTest,SelectionRequestHasherTest,TargetRoleSelectionServiceTest,TargetRoleSelectionControllerTest,TargetRoleSelectionProductionBoundaryTest" test` | PASS — 39 tests, 0 failures/errors/skips | Previously approved non-Docker slices remain green after adding T4 suite |
| 2026-10-02 | T4 rerun after Docker enabled | `.\mvnw.cmd "-Dtest=TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | PASS — 7 tests, 0 failures/errors/skips | Flyway V1–V7 on disposable PostgreSQL 17.6; transaction, replay, uniqueness/concurrency, rollback, pathway and F01/PostgreSQL bridge evidence |
| 2026-10-02 | T1–T4 regression | `.\mvnw.cmd "-Dtest=TargetRoleSelectionDomainTest,SelectionRequestHasherTest,TargetRoleSelectionServiceTest,TargetRoleSelectionControllerTest,TargetRoleSelectionProductionBoundaryTest,TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | PASS — 46 tests, 0 failures/errors/skips | All executable T1–T4 cases, including disposable PostgreSQL integration |
| 2026-10-02 | T4 confirmation rerun | `.\mvnw.cmd "-Dtest=TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | PASS — 7 tests, 0 failures/errors/skips | Reconfirmed on Docker Engine 29.8.1 and a fresh disposable PostgreSQL 17.6 container |
| 2026-10-02 | T4 post-approval confirmation | `.\mvnw.cmd "-Dtest=TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | PASS — 7 tests, 0 failures/errors/skips | Post-approval rerun on Docker Engine 29.8.1; Flyway V1–V7 and all six disposable PostgreSQL 17.6 cases executed without skip |
| 2026-10-02 | T5 frontend selection + F01 regression | `npm.cmd test -- <8 scoped test files>` | PASS — 8 files, 30 tests | Selection API/query/mutation, active summary, all terminal/retryable dialog errors, stale refetch, initial/change/same-role, Confirm/Cancel, prepared-key reuse, double-submit lock, server-backed route, and preserved F01 browse/detail/API regression |
| 2026-10-02 | T6 clean full backend regression | `.\mvnw.cmd clean test` | PASS — 17 suites, 84 tests, 0 failures/errors/skips | Clean JUnit regression including disposable PostgreSQL and Neo4j Testcontainers on Docker Engine 29.8.1; corrected the earlier 90/18 count that included one stale Surefire XML report |
| 2026-10-02 | T6 full frontend regression | `npm.cmd test` | PASS — 8 files, 30 tests | All configured Vitest files, including T5 and preserved F01 regression |
| 2026-10-02 | T6 build/lint | `.\mvnw.cmd "-DskipTests" package`; `npm.cmd run build`; `npm.cmd run lint` | PASS | Backend executable jar and frontend production bundle built; oxlint returned 0 errors and 15 pre-existing out-of-scope warnings |
| 2026-10-02 | T6 Compose/API system | `docker compose -f compose.dev.yml up --build -d`; PowerShell HTTP requests through `127.0.0.1:8088` | PASS | Stack healthy/migrate exit 0; prior smoke paths plus two-role stale, competing change and assessment-active state-preservation scenarios passed |
| 2026-10-02 | Pre-Cụm-4 browser/API system cleanup | `npm.cmd run test:system:f02` on the working stack and an isolated one-use Compose project | PASS — 2/2 Playwright/Chrome scenarios on both runs | Isolated stack was verified at GET `204` before the run; setup created the initial selection, then catalog/detail and accessible dialogs, Cancel/Confirm/UI refresh, stale state preservation, and one-winner competing changes passed. Temporary containers/volumes were removed afterward. |
| 2026-10-02 | T4 fixture-extension regression | `.\mvnw.cmd "-Dtest=TargetRoleSelectionPostgresIntegrationTest,ConfiguredAssessmentActivityGuardAdapterTest" test` | PASS — 8 tests, 0 failures/errors/skips | Existing T4 cases plus repeatable two immutable target-role references in the development-only seed |

T1 uses no Spring context, database, container, or development seed. It is unit evidence only; it does not prove transaction, adapter, API, or system behavior.

### T2 executable mapping

Test file: `backend/src/test/java/com/adaptlearngraph/learning/application/TargetRoleSelectionServiceTest.java`.

The deterministic fixture uses learner `00000000-0000-0000-0000-000000000001`, organization `00000000-0000-0000-0000-000000000002`, two role snapshots, a fixed clock, and fake/in-memory ports defined in the test file. Actor and organization always come from the fake trusted context, never the command.

| Policy/branch | Test method(s) | Expected observation |
| --- | --- | --- |
| Trusted actor authorization | `requiresTrustedAuthenticatedActiveEmployeeBeforeReadingDependencies` | Missing actor is `UNAUTHENTICATED`; inactive/non-Employee is `FORBIDDEN`; no catalog/transaction read |
| Catalog recheck and trusted tenant | `createsInitialSelectionUsingTrustedTenantAndRecheckedCatalogRole`, `missingCatalogRoleIsMaskedAsRoleNotAvailable` | Trusted organization/role reach catalog; missing role is public unavailable with no write |
| Initial/change/no-op | `createsInitialSelectionUsingTrustedTenantAndRecheckedCatalogRole`, `changesRoleOnlyForExpectedCurrentSelectionAndChecksAssessment`, `sameRoleIsNoOpWithoutGuardRevisionPathwayOrEvent` | Correct disposition/revision/event; no-op does not guard/archive/emit |
| Expected selection/stale | `rejectsMissingExpectedSelectionWhenRequestWouldOverwriteCurrentRole`, `rejectsStaleExpectedSelectionWithoutCallingAssessmentGuard` | `STALE_SELECTION`; current state remains unchanged |
| Assessment-active guard | `blocksRoleChangeWhileAssessmentIsActive` | `ASSESSMENT_IN_PROGRESS`; no pathway/event/state change |
| Successful replay | `successfulReplayPreservesOriginalChangedAndSkipsCatalogAndTransaction`, `noOpReplayPreservesOriginalUnchangedOutcome` | Original `changed=true/false` is preserved; no duplicate event/revision |
| Key/hash conflict and pending | `sameIdempotencyKeyWithDifferentCanonicalHashConflicts`, `pendingRequestReturnsRequestInProgressWithoutRecheckingCatalog` | `IDEMPOTENCY_CONFLICT` or `REQUEST_IN_PROGRESS`; no second processing |
| Dependency failures | `catalogFailureMapsToCatalogUnavailableWithoutStartingTransaction`, `assessmentDependencyFailureMapsToDependencyUnavailableAndFakeTransactionRollsBack`, `pathwayDependencyFailureMapsToDependencyUnavailableAndFakeTransactionRollsBack` | Stable catalog/dependency errors and unchanged fake state |

T2 uses no Spring context, JDBC, database, container, or development seed. Its fake transaction rollback verifies application orchestration only and must not be reported as PostgreSQL atomicity or integration evidence. No production-code defect was found during T2, so this slice changed tests and documentation only.

### T3 executable mapping

Test files:

- `backend/src/test/java/com/adaptlearngraph/learning/api/TargetRoleSelectionControllerTest.java`
- `backend/src/test/java/com/adaptlearngraph/learning/api/TargetRoleSelectionProductionBoundaryTest.java`

| HTTP/security branch | Test method | Expected observation |
| --- | --- | --- |
| GET empty/current | `getReturnsNoContentWhenThereIsNoActiveSelection`, `getReturnsCurrentSelectionContractWithChangedFalse` | `204` empty or complete `200` snapshot with `changed=false` |
| PUT mapping | `putReturnsSelectionAndForwardsOnlyHeaderAndBodyCommandFields` | `200`; header/body become command while untrusted organization JSON is ignored |
| Invalid request | `invalidHeaderBodyUuidAndNilIdentityMapToBadRequest` | Missing/blank key, null/malformed/nil role return stable `400 INVALID_REQUEST` |
| Application error mapping | `mapsApplicationErrorsToStableHttpContract` | `401/403/404/409/503` and stable public code/message for every application code |
| Local security | `localSecurityPermitsGetAndCsrfLessPutButDeniesOtherMethods` | Flagged local GET/PUT allowed; PUT works without CSRF token only for this endpoint; POST denied |
| Production boundary | `selectionGetAndPutRemainDeniedWithoutLocalProfileAndActorFlag` | Default chain returns `401` for GET and CSRF-valid PUT, proving no local bypass |

T3 uses Spring MVC/Security slice tests with a mocked use case. It proves HTTP mapping and filter-chain policy, not application persistence, PostgreSQL/Neo4j integration, or full-system behavior. No production-code defect was found during T3.

### T4 executable mapping

Test files:

- `backend/src/test/java/com/adaptlearngraph/learning/infrastructure/TargetRoleSelectionPostgresIntegrationTest.java`
- `backend/src/test/java/com/adaptlearngraph/learning/infrastructure/ConfiguredAssessmentActivityGuardAdapterTest.java`

The PostgreSQL suite uses a disposable `postgres:17.6-alpine` container, cleans and reapplies Flyway V1–V7 before each case, and creates deterministic synthetic organization/account/catalog fixtures. It never connects to the development Compose volume or uses development seed as an oracle.

| Integration/contract branch | Test method | Planned observable evidence; 2026-10-02 result |
| --- | --- | --- |
| Atomic lifecycle/replay | `persistsInitialNoOpChangeAndHistoricalReplayWithAtomicRevisionAuditAndOutbox` | Selection/history/request/snapshot/revision/audit/outbox payload and historical replay; **PASS** |
| DB uniqueness/concurrent claim | `databaseConstraintsAndConcurrentClaimsKeepOneActiveSelectionAndOneRequest` | One active selection and one winning idempotency claim; **PASS** |
| Competing changes | `serializesCompetingChangesAndRejectsTheStaleLoser` | Learner lock serializes two commands, one applied and one stale; **PASS** |
| Transaction rollback | `pathwayDependencyFailureRollsBackClaimAndAllSelectionWrites` | Injected pathway failure rolls back request/selection/revision/event writes in real PostgreSQL transaction; **PASS** |
| Provisional pathway adapter | `provisionalPathwayAdapterArchivesMatchingPathwayAndRejectsMismatchedSelection` | Matching current pathway becomes `SUPERSEDED`; mismatch fails; no-pathway is explicit; **PASS** |
| F01/PostgreSQL catalog bridge | `f01BridgeUsesTrustedOrganizationAndRequiresOnePublishedPostgresReference` | Trusted organization reaches F01 port and exactly one open-release reference is required; **PASS** |
| Repeatable development references | `developmentSelectionSeederIsRepeatableWithTwoImmutableRoleReferences` | Running the local/demo seed twice preserves exactly two immutable role references without updating historical rows; **PASS** |
| Configured assessment guard | `hasExplicitAllowBlockAndInvalidIdentityBehavior` | Explicit allow/block and invalid learner behavior; **PASS** |

The F01 bridge case uses a deterministic recording F01 port plus the real PostgreSQL reference adapter; it does not replace the separate Neo4j adapter/tenant tests or real Catalog-owner integration. The injected pathway failure exists only to verify real PostgreSQL rollback. The original seven T4 cases passed after Docker became available; the final fixture-extension rerun passed eight cases. Two failed reruns before the original pass exposed only fixture defects—schema cleanup/timestamp binding and historical assertion/shared UUID sequencing—which were corrected without business-production changes.

### T5 executable mapping

Test files:

- `frontend/src/features/employee/target-roles/targetRoleSelectionApi.test.ts`
- `frontend/src/features/employee/target-roles/targetRoleSelectionQueries.test.tsx`
- `frontend/src/features/employee/target-roles/ActiveTargetRoleSummary.test.tsx`
- `frontend/src/features/employee/target-roles/TargetRoleSelectionDialog.test.tsx`
- `frontend/src/features/employee/target-roles/TargetRoleSelectionFlow.test.tsx`
- `frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.test.tsx`
- `frontend/src/features/employee/target-roles/targetRoleApi.test.ts`
- `frontend/src/app/AppTargetRoleRoute.test.tsx`

| Frontend branch | Executable observation; 2026-10-02 result |
| --- | --- |
| API parser and command | `204` empty, valid current selection, invalid snapshot/revision rejection, normalized prepared command, PUT idempotency/expected-selection body and stable public errors; **PASS** |
| React Query boundary | Canonical selection query key, command forwarding and selection invalidation after mutation success; **PASS** |
| Active summary | Loading, error/retry, empty and current snapshot/revision states; **PASS** |
| Dialog/error states | Pending disables Cancel/Confirm; assessment-active, stale/state-conflict, unavailable role and idempotency conflict are terminal; pending request and catalog/dependency failures remain retryable; **PASS** |
| Selection interaction | Initial Cancel causes no mutation; change carries expected selection; same role is disabled; stale mutation refetches current selection; retry reuses the same prepared command/key; synchronous double submit invokes mutation once; **PASS** |
| F01 regression | Browse/detail, debounce/filter clear, tenant-empty guidance, dependency retry, unavailable detail, responsibility/mastery rendering, and F01 API parsing remain green; **PASS** |
| Routed page boundary | `/employee/target-roles` resolves to the server-backed page without invoking the legacy selection handler or writing selection to `localStorage`; **PASS** |

T5 uses mocked browser fetch/hooks where appropriate and is frontend unit/component evidence, not backend integration or system evidence. No production-code defect was found in that slice; T6/full regression/build/lint were run separately after T5 approval.

### T6 regression and system evidence

- Clean full backend regression passed 84 tests across 17 suites with no failure, error or skip. The prior 90/18 number was an evidence-counting error caused by one stale Surefire report for a class no longer in source; `clean test` removed it. Full frontend regression passed all 30 configured tests across eight files.
- Backend package and frontend production build passed. Oxlint completed with no errors; its 15 warnings are in existing shared/manager/assessment components outside F02.
- The Compose stack rebuilt successfully with PostgreSQL 17.6 and Neo4j 5.26 healthy, migration exiting 0, API healthy, and the frontend proxy serving `/api/v1/system/status` plus F01/F02 endpoints.
- The local/demo actor and deterministic two-role fixture supports Java Backend Developer P3 and Platform Engineer P4 with matching immutable PostgreSQL references. Earlier initial/replay/no-op/conflict/validation/unavailable and Neo4j outage/recovery checks remain green.
- Two concurrent same-role requests both returned unchanged and left the active selection/revision intact. This does not replace the T4 competing role-change integration case.
- With Neo4j stopped, a fresh selection command returned `503 CATALOG_UNAVAILABLE` after the driver retry window while the PostgreSQL current-selection read remained intact. Neo4j was restarted and all final health checks passed.
- A stale expected-selection request returned `409 STALE_SELECTION` and preserved selection/revision. Two competing changes produced exactly one `200` and one `409 STALE_SELECTION`, with the revision incremented once. With the configured assessment guard enabled, a change returned `409 ASSESSMENT_IN_PROGRESS` and preserved state; Compose was restored to the default `false` afterward.
- Computer Use still exposed no browser surface, so the repository uses pinned Playwright 1.63.0 with installed headless Chrome. Pre-Cluster-4 cleanup made setup tolerate both GET `204` and an existing selection, added semantic dialog assertions, and added executable stale/competing-change API coverage. Both Playwright scenarios passed after one test-only strict-locator correction. Vitest is explicitly scoped to source unit/component files to prevent cross-discovery of Playwright specs.
- Local system evidence is complete for the approved Cluster 2 scope. Production Identity, real Catalog-owner handoff, assessment-activity and pathway adapters are still provisional and must be revalidated when delivered; F02 is not marked production Done.
