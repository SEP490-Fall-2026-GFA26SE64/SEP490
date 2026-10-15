# REQ-002-F02 — Unit, API and frontend evidence

## Fixtures and scope

- Backend services use deterministic in-memory ports and fixed UUID/clock values; they do not use development Compose data.
- API tests use the local trusted L&D actor boundary. The production-boundary test supplies valid CSRF and confirms unauthenticated access still returns 401 before the controller is reached.
- Frontend tests mock fetch at the API boundary and verify request headers, response parsing and visible UI state.

## Executable cases

| Test file | Cases | Rules |
| :--- | :--- | :--- |
| `BaselineBlueprintServiceTest` | trusted actor/catalog snapshot normalization; unauthenticated/inactive/wrong-role rejection; complete shortage reporting/no persist; disabled-role preservation; idempotent replay/conflict; immutable successor/stale conflict; dependency failure mapping | R1–R3 |
| `BaselineAssessmentDraftServiceTest` | exact manifest/weights/pinned metadata; replay and successor generation; idempotency conflict; changed coverage/no partial persist; exact-hash review/publish and retry; invalid hash/missing draft; authorization before dependencies | R1, R4–R6 |
| `BaselineBlueprintControllerTest` | local create contract; 422 structured shortage; generated response excludes protected answer material | R1, R2, R4 |
| `BaselineBlueprintProductionBoundaryTest` | starter profile rejects a CSRF-valid unauthenticated authoring POST with 401 | R1 |
| `baselineBlueprintApi.test.ts` | idempotency/expected-version requests; shortage parsing; safe manifest parsing; distinct review/publish endpoints; malformed publication-state rejection | R2–R6 |
| `BaselineBlueprintPage.test.tsx` | ordered save/generate/review/publish flow; actionable shortage with generation disabled | R8 |

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
