# REQ-060-F01-F03: Registration unit, component and boundary evidence

## R1 refinement run, 2026-10-26

Separate organization/account steps, Back preservation, inline validation/focused summary, unchanged nullable payloads, secure resume and EN/VI were checked in the [R1 focused unit/build run](REQ-039-transactional-email.md): 29 frontend tests and 78 backend/API/integration/architecture checks, both exit 0. These are shared suite totals, not additional independent counts. Historical revision-12 evidence and live Gmail limitations below remain unchanged.

**Contract:** [Organization onboarding, approved revision 12](../../features/Organization%20onboarding/README.md#implementation-brief-registration-first).  
**Date:** 2026-10-21. **Result:** Passed at this tier; live Gmail acceptance remains blocked, not Complete.

## Environment and scope

Windows, Java 21.0.6, Node 22.15.0, existing Maven wrapper/Vitest/oxlint. No Python installation or unrelated dependency upgrade. Tests use synthetic identities and isolated doubles where appropriate; production registration does not use simulated verification.

| Acceptance | Executable suite | Actual result |
| --- | --- | --- |
| AC-01, AC-02 | `RegistrationFieldsTest` | 6 passed: required fields, choices/nulls, normalized email/slug, generated/fallback slug and password boundaries. |
| AC-03, AC-04, AC-07 | `RegistrationCryptographyTest` | 5 passed: randomized AES-GCM, purpose binding, password hashing, HMAC, RFC 6238 six-digit values, +/-1-step drift, replay, missing keys and generated code shapes. |
| AC-07 | `HexagonalArchitectureTest` | 3 passed; domain/application remain Spring-independent. |
| AC-07 | `TargetRoleProductionBoundaryTest`, `TargetRoleSelectionProductionBoundaryTest` | 1 passed each; unrelated production business endpoints retain default-deny behavior. |
| AC-07 | `SystemStatusTest`, `WorkerProfileTest` | 4 + 1 passed; database-free starter and non-HTTP worker remain usable. Starter does not expose registration routes. |
| AC-01, AC-04, AC-06, AC-08 | [GuestRegisterPage.test.tsx](../../../frontend/src/features/guest/GuestRegisterPage.test.tsx) | 6 passed: null optional values, preserved input/errors/focus, ignored legacy localStorage flags, MFA/recovery UI and secure resume. |
| AC-06, AC-07, AC-08 | [registrationApi.test.ts](../../../frontend/src/features/guest/registrationApi.test.ts) | 6 passed: response validation, error handling, CSRF/session behavior and secret-bearing response shapes. |
| AC-08 | TypeScript/Vite production build and focused oxlint | Passed; existing large-bundle warning remains, not a registration failure. |

Real HTTP/JDBC-session tests are recorded at the [integration tier](../integration/REQ-060-registration.md), not counted again as unit tests.

## Executed commands and history

From `backend`, focused runs included:

```powershell
.\mvnw.cmd '-Dtest=RegistrationFieldsTest,RegistrationCryptographyTest,RegistrationPostgresIntegrationTest,RegistrationApiIntegrationTest,DatabaseSchemaTest,HexagonalArchitectureTest,TargetRoleProductionBoundaryTest,TargetRoleSelectionProductionBoundaryTest' test
.\mvnw.cmd '-Dtest=RegistrationPostgresIntegrationTest,RegistrationCryptographyTest' test
.\mvnw.cmd '-Dtest=RegistrationApiIntegrationTest,SystemStatusTest,WorkerProfileTest,HexagonalArchitectureTest,TargetRoleProductionBoundaryTest,TargetRoleSelectionProductionBoundaryTest' test
```

- First combined run: **36 passed**. After adding collision/choice coverage, focused persistence/crypto rerun: **22 passed** (17 + 5), 19:19 +07:00.
- Starter regression check initially failed because registration attempted to require JDBC in the intentionally database-free `starter` profile. Registration configuration/controller now exclude that profile; the isolated API test configuration is excluded from application component scans. Final API/profile/boundary/architecture rerun: **14 passed**, 19:29 +07:00.
- Across these final focused suites there are **43 distinct backend tests**, not the sum of repeated runs.
- An earlier transient generated-class write failure was resolved by retrying after inspection, without changing permissions or deleting existing output.

From `frontend`:

```powershell
npm.cmd test -- src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts
npm.cmd run build
npm.cmd exec oxlint -- src\features\guest\GuestRegisterPage.tsx src\features\guest\GuestLayout.tsx src\features\guest\registrationApi.ts src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts system-tests\REQ-060-registration.spec.ts
```

Final component/API run: **12 passed**, build/lint exit 0. Earlier failures identified TypeScript parameter-property/self-reference issues and slow per-character test input; explicit typing and paste interactions fixed them. The mobile focus/header correction was followed by the same passing checks and browser verification.

Maven XML/text reports are generated under [backend/target/surefire-reports](../../../backend/target/surefire-reports/). Editor test discovery did not discover these suites; existing CLI runners supplied the actual results.

## Limits

This is not a full repository test run or production certification. Gmail credentials, inbox receipt and a human-operated authenticator are not validated by unit doubles. See [system results and remaining gate](../system/REQ-060-registration.md).

## Revision 13: Public landing (2026-10-21)

**Contract:** [Approved frontend enhancement](../../features/Organization%20onboarding/README.md#public-landing-and-guest-entry-revision-13). **Result:** Passed at this tier. This run supplements, not replaces, revision 12 evidence. Windows/Node 22.15.0, Vitest 5.0.2, TypeScript 6 and Vite 8.3.0; final run began at 22:21 +07:00.

| Acceptance | Check | Actual result |
| --- | --- | --- |
| LP-01, LP-02, LP-04, LP-05 | [GuestLandingPage.test.tsx](../../../frontend/src/features/guest/GuestLandingPage.test.tsx) | 5 passed: complete content and all CTA hrefs, keyboard FAQ/ARIA relationships, menu Escape/focus, EN/VI switching and enterprise demo-control regression. Real Motion components run with isolated browser API stubs. |
| LP-05 | Existing registration component and API suites | 12 passed (6 + 6); no registration API/security contract changes. |
| LP-05 | TypeScript/Vite build | Passed, exit 0. Lazy landing/Motion chunk: 99.54 kB minified / 33.29 kB gzip. Main application chunk: 1,991.03 kB; existing >500 kB warning remains. |
| LP-05 | Focused oxlint | Passed, exit 0, for the landing, tests, login, routes and translation files below. |

From `frontend`, stopping on a nonzero exit between checks:

```powershell
npm.cmd test -- src\features\guest\GuestLandingPage.test.tsx src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts
npm.cmd run build
npm.cmd exec oxlint -- src\features\guest\GuestLandingPage.tsx src\features\guest\GuestLandingPage.test.tsx src\features\auth\LoginPage.tsx src\app\App.tsx src\shared\i18n\translations\en.ts src\shared\i18n\translations\vi.ts system-tests\REQ-060-landing.spec.ts
```

Execution history:

1. Runtime tests passed, but the first build after adding tests rejected four `exact` properties unsupported by Testing Library's `ByRoleOptions`. Removed those properties (string names already match exactly); valid Playwright options were retained.
2. Combined rerun: 17 passed, build/lint exit 0.
3. Browser screenshot review found that `text-card` selected the surface color instead of only the intended font size on the new brand label. Used the explicit typography length token and added real-browser light/dark foreground assertions.
4. Final rerun after that fix: **17 passed across three files**, build/lint exit 0. No new backend tests were needed for this presentation-only change; historical backend results are not counted as new runs.

Dependency scope: added exact `motion@14.5.0`, resolving `framer-motion@14.5.0`, `motion-dom@14.5.0` and `motion-utils@14.1.1`. The scoped advisory check returned no known findings for these four packages. Whole-tree npm audit reported **two high findings**, in existing Vite and source-map-js; no unrelated upgrades were made. Existing jsdom/transitive Node engine warnings appeared during installation, but the recorded targeted tests and build passed. This is not a comprehensive security review or production-readiness claim.
