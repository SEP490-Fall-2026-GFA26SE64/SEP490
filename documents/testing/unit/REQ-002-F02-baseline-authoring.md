# REQ-002-F02 — Unit, API and frontend evidence

## Occupation-scoped cases — executed 2026-10-15

Executable cases now cover one blueprint per Occupation, exact full-role membership, zero-question role retention/exclusion, minimum Easy/Medium/Hard coverage per skill, strict linked weights, current capacity reads, aggregate shared-skill coverage, unique generated questions and Occupation-first UI behavior. Neo4j Level-union traversal is recorded in the integration evidence.

## Fixtures and scope

- Backend services use deterministic in-memory ports and fixed UUID/clock values; they do not use development Compose data.
- API tests use the local trusted L&D actor boundary. The production-boundary test supplies valid CSRF and confirms unauthenticated access still returns 401 before the controller is reached.
- Frontend tests mock fetch at the API boundary and verify request headers, response parsing and visible UI state.

## Executable cases

| Test file | Cases | Rules |
| :--- | :--- | :--- |
| `BaselineBlueprintServiceTest` | trusted actor/catalog snapshot normalization; unauthenticated/inactive/wrong-role rejection; complete shortage reporting/no persist; participating per-skill difficulty minimum; `hard > medium > easy` rejection; idempotent replay/conflict; immutable successor/stale conflict; dependency failure mapping | R1–R3, CW1–CW2 |
| `BaselineBlueprintCapacityServiceTest` | trusted actor/organization scope; unique Occupation skill lookup; sorted capacity response; missing bucket as zero; unauthenticated/forbidden/not-found/dependency mapping | CW3 |
| `OccupationBaselineBlueprintPolicyTest` | exact all-and-only role/skill membership; canonical snapshots; zero-role retention; all-zero rejection; aggregate shared-skill demand; one logical Occupation identity across revisions | R9–R13 |
| `BaselineAssessmentDraftServiceTest` | exact manifest/weights/pinned metadata; replay and successor generation; idempotency conflict; changed coverage/no partial persist; exact-hash review/publish and retry; invalid hash/missing draft; authorization before dependencies | R1, R4–R6 |
| `BaselineAssessmentGeneratorOccupationTest` | zero roles do not produce items; shared question versions are unique across role allocations; aggregate shortage retains per-role contributions | R11, R13 |
| `BaselineBlueprintControllerTest` | local create contract; 422 structured shortage; generated response excludes protected answer material | R1, R2, R4 |
| `BaselineOccupationCatalogControllerTest` | capacity HTTP response contains metadata/counts without answer material; stable failure-to-status mapping | CW3 |
| `BaselineBlueprintProductionBoundaryTest` | starter profile rejects a CSRF-valid unauthenticated authoring POST with 401 | R1 |
| `baselineBlueprintApi.test.ts` | Occupation list/detail/latest/capacity parsing; malformed timestamp/count rejection; idempotency/expected-version requests; aggregate shortage parsing; safe manifest parsing; distinct review/publish endpoints | R2–R6, R9, R13–R14, CW3 |
| `baselineBlueprintForm.test.ts` | deterministic role-total distribution; balanced skill/difficulty cells; exact percentage/decimal sums; total-zero clearing and `40%` ↔ `0.4` conversion | UX1–UX3 |
| `baselineBlueprintCapacity.test.ts` | minimum `3 × N`; feasible maximum after shared demand; deterministic minimum-first allocation; zero clearing; per-cell and aggregate shared-pool issues | CW2–CW4 |
| `baselineBlueprintWeights.test.ts` | canonical parser; absolute/dynamic boundaries; exact `100%`; linked rebalance; divider movement and strict hierarchy | CW1 |
| `BaselineWeightControl.test.tsx` | text inputs without spinner; invalid raw input retention; input/slider synchronization; accessible dividers/clamping; zero-role exception | CW1 |
| `BaselineBlueprintPage.test.tsx` | ordered save/generate/review/publish; actionable shortage; capacity retry preserves draft; all roles visible; capacity-aware Apply/manual edit/zero clearing; decimal load; EN/VI state retention; independent multi-open role panels; excluded-role wire compatibility | R8, R11, R14, UX2–UX6, CW1–CW4 |

`CW1`: linked weight invariant. `CW2`: one question per skill/difficulty. `CW3`: trusted capacity read contract. `CW4`: feasible total and shared-pool early validation.

## Linked weight/capacity run evidence — 2026-10-16

```powershell
cd backend
.\mvnw.cmd -q "-Dtest=BaselineOccupationCatalogControllerTest,BaselineBlueprintServiceTest,BaselineBlueprintCapacityServiceTest,OccupationBaselineBlueprintPolicyTest" test

cd ..\frontend
npm.cmd test -- --run
```

Results: backend scoped unit/API **18 passed**, 0 failures/errors/skips. Frontend linked-policy/component/page coverage contributes **36 passed** across five files; full frontend regression passed **69/69** across 14 files. Production build passed and lint exited 0 with pre-existing warnings outside the changed baseline files.

## UX/i18n run evidence — 2026-10-16

```powershell
cd frontend
npm.cmd test -- --run src/features/manager/baseline-blueprints/baselineBlueprintForm.test.ts src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts src/features/manager/baseline-blueprints/BaselineBlueprintPage.test.tsx
npm.cmd test -- --run
```

Results: scoped **16 passed** across 3 files; full regression **46 passed** across 11 files. The final production build also passed, and lint exited 0 with only pre-existing warnings outside the changed baseline files.

## Run evidence — 2026-10-15

Backend scoped command (executed in the Maven build-stage image because a Windows process held the host `backend/target` output):

```powershell
docker run --rm adapt-learn-graph-backend-teststage:local mvn -B -ntp test "-Dtest=BaselineBlueprintServiceTest,OccupationBaselineBlueprintPolicyTest,BaselineAssessmentDraftServiceTest,BaselineAssessmentGeneratorOccupationTest,BaselineBlueprintControllerTest,BaselineBlueprintProductionBoundaryTest"
```

Result: **24 passed**, 0 failures/errors/skips.

```powershell
cd frontend
npm.cmd test -- src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts src/features/manager/baseline-blueprints/BaselineBlueprintPage.test.tsx
npm.cmd test
```

Results: scoped **9 passed** across 2 files; full regression **39 passed** across 10 files.

## Run evidence — 2026-10-14

```powershell
cd backend
.\mvnw.cmd test -Dtest="BaselineBlueprintServiceTest,BaselineAssessmentDraftServiceTest,BaselineBlueprintControllerTest,BaselineBlueprintProductionBoundaryTest,BaselineAssessmentPostgresIntegrationTest"
```

Result: **21 passed** total; 18 are application/API/security cases and 3 are PostgreSQL integration cases.

```powershell
cd frontend
npm.cmd test
```

Result: **37 passed** across 10 files; REQ-002 contributed **7 passed** across 2 files.

The first production-boundary run expected 401 without CSRF and received 403 from the CSRF filter. The test was strengthened by adding a valid CSRF token, after which it passed with 401 from the authentication boundary.
