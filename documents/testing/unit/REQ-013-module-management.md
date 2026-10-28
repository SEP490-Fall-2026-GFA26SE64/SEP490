# REQ-013/016 module management — unit evidence

Scope: new local authoring workflow, not automatic acceptance of legacy catalog migration or production identity.

## Executable coverage

- `backend/src/test/java/com/adaptlearngraph/catalog/application/ModuleAuthoringServiceTest.java`: complete schema fields; creator versus subsequent editors; stable mapping identities; shared Occupation edit rule; stale-write rejection; primary/duplicate mapping and positive-price validation; authorization and submitted-package locking; revision release and learner pin retention; archive coverage/deletion guards; durable failed-publication retry.
- `backend/src/test/java/com/adaptlearngraph/architecture/HexagonalArchitectureTest.java`: domain/application/controller layer boundaries.
- `frontend/src/features/expert/modules/ModuleManagementWorkspace.test.tsx`: authenticated scoped data loading/empty CTA, primary-skill validation, retained form/cancel on server conflict, HTTP error propagation, raw HTML/unsafe-link non-execution and failed-video fallback.

## Execution

Historical run before shared-login correction (2026-10-28): **7 service cases + 3 ArchUnit rules passed, 0 failures/errors/skips**; the same command also passed the dedicated real-store integration case. Initial sandbox execution failed because Mockito could not attach to the JVM; the outside-sandbox rerun passed. Frontend **4 component/API/rendering cases passed** using bundled Node 24.19.0. TypeScript build, focused Oxlint and Vite production build passed; Vite retained an existing large-chunk advisory. Shared FormField now uses explicit label/control IDs, after real-browser verification exposed an ambiguous implicit select label.

Commands: `bash mvnw -q -Dtest=ModuleAuthoringServiceTest,HexagonalArchitectureTest test` in backend; `node node_modules/vitest/vitest.mjs run src/features/expert/modules/ModuleManagementWorkspace.test.tsx`, `node node_modules/typescript/bin/tsc -b`, `node node_modules/vite/bin/vite.js build` in frontend. The bundled Node executable was used because host Node 22.16.0 is below several installed test dependencies' engine requirements.

## Shared-login correction — 2026-10-28

- `ModuleSessionSecurityTest`: 5 passed. Covers missing cookie, retired Basic credentials (401 without browser Basic challenge), unknown persona/client role header, active Expert role/organization resolution, inactive/missing account, and no identity carry-over when the next request has no cookie.
- Service (7) and ArchUnit (3) passed in the same run. The integration case encountered a Neo4j container startup timeout; that setup error is recorded separately and is not a business assertion pass.
- Workspace, main LoginPage and shared-session hook: 21 frontend tests passed. Includes automatic credentialed session loading without Basic headers/password inputs, missing-session main-login CTA and retry, Expert main-login session establishment before navigation, and shared-cookie logout.
- TypeScript and Vite build passed. Existing Vite large-chunk warning remains.

Focused Oxlint is clean after moving retry state reset into the retry action. The subsequent dedicated real-store integration rerun also passed; see integration evidence.

## Neo4j list correction — 2026-10-28

Executed backend command: `env DOCKER_API_VERSION=1.51 bash mvnw -q '-Dtest=ModuleAuthoringServiceTest,ModuleAuthoringIntegrationTest#readsGraphCatalogWithoutAuthoringHistoryAndMapsEverySchemaField,HexagonalArchitectureTest' test`. **9 service cases + 3 architecture rules passed**, 0 failures/errors/skips; the dedicated integration case also passed separately within the same run. New cases verify merged graph/catalog rows, no fabricated history or auto-save, graph values taking precedence, deduplication, scoped/private/foreign authoring exclusion, filter/count/paging behavior, read-only access without a write grant, and Employee rejection.

Frontend command: `node node_modules/vitest/vitest.mjs run src/features/expert/modules/ModuleManagementWorkspace.test.tsx --maxWorkers=1`: **6 passed**, 7.22s. New coverage renders a graph-only module, complete detail fields/TEACHES metadata, nullable reviewer/history, no edit/history controls, close behavior and server search requests. TypeScript initially caught unsupported Testing Library `exact` options; selectors were corrected to anchored names, then TypeScript passed. Focused Oxlint and Vite production build passed (existing large-chunk advisory remains).
