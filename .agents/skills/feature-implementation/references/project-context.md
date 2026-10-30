# Project Context Map

Verified: 2026-10-21. Paths and examples are navigation anchors, not proof that a feature is implemented. Resolve commands from the indicated working directory. Follow the current files if versions, scripts or structure change.

## Entry References

| Read first | Purpose |
| --- | --- |
| [Project instructions](../../../../AGENTS.md) | Binding workflow, design and engineering safeguards. |
| [Confirmed Version 2](../../../../documents/FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) | Product actors/functionality in 3.2(c), applicable NFRs and approved technical direction. |
| [Product overview](../../../../documents/PRODUCT_OVERVIEW.md) | Current scope and unresolved policies. |
| [Feature index](../../../../documents/features/README.md) | Find the owning domain contract and stable requirement/function IDs. |
| [Architecture](../../../../documents/ARCHITECTURE.md) | Required product target, store ownership, existing runtime and migration gaps. |

Read relevant sections, not all documents in full. The feature index currently routes to consolidated domain README files with `req-nnn-fnn` anchors. Preserve these anchors; do not recreate a file per function. Read the function row, associated rules/decisions and materially related contracts, including different actors in the same workflow.

For each task, verify the selected paths exist and inspect their current content. When an anchor moves, search its nearest owning directory or symbol and correct the reference after confirming the replacement. Do not repeatedly inventory the entire repository. Do not rely on this map's date or a previous test result as evidence of current behavior.

Before planning, inventory only the selected function and direct dependencies as implemented, partial, missing, incorrect or unverified, with current source evidence and reuse candidates. Keep that inventory and the working contract in temporary session storage. Existing behavior should be preserved and verified, not recreated; propose only the evidenced delta. Read domain READMEs as durable feature definitions, not as a place to save interviews or implementation plans. Update their affected outcomes and business rules only after implementation and required verification are complete; keep tests and architecture in their dedicated documents.

## Architecture and Persistence

| Reference | Use when |
| --- | --- |
| [Neo4j field inventory](../../../../documents/neo4j_schema.md) | Affected catalog fields, mappings, review metadata or graph relationships. |
| [Diagram inventory](../../../../documents/diagrams/README.md) | Existing database/runtime diagrams help resolve ownership or references. |
| [PostgreSQL migrations](../../../../backend/src/main/resources/db/migration/) | Confirm actual persisted fields, nullability, constraints and forward-migration history. |
| [Neo4j migrations](../../../../backend/src/main/resources/db/neo4j/) | Confirm graph constraints and migration history. |
| [Backend build](../../../../backend/pom.xml) | Current Java/Spring dependencies and test tooling. |

Version 2 defines desired functionality; architecture and actual migrations describe the current implementation separately. The legacy dataset's single-catalog and one-to-one `TEACHES` rules do not implement the required multi-organization, many-to-many coverage. Propose and obtain approval for any necessary migration; never modify schemas merely to accommodate prototype UI attributes.

PostgreSQL owns transactional identity, subscriptions, workflows, assessment/evidence and progress. Neo4j owns catalog relationships. The target also includes MinIO, payOS, local LLM inference and SMTP/Gmail; confirm an integration actually exists before planning to call it. Do not infer deployment readiness from an architectural target or a mock screen.

Inventory affected fields with types, nullability, store ownership, validation, server/client ownership and authorized visibility. Preserve valid nulls and history. Do not invent reviewer identities/timestamps or expose every persistence field in every DTO/form.

## Backend Anchors

Feature modules under [backend source](../../../../backend/src/main/java/com/adaptlearngraph/) use `api`, `application`, `domain` and `infrastructure` boundaries. Find the requested feature's owner first; these selection examples are reusable structure, not universal business rules.

| Example | Reusable pattern |
| --- | --- |
| [Selection controller](../../../../backend/src/main/java/com/adaptlearngraph/learning/api/TargetRoleSelectionController.java) | HTTP adapter and request/response boundary. |
| [Selection use case](../../../../backend/src/main/java/com/adaptlearngraph/learning/application/port/in/TargetRoleSelectionUseCase.java) | Inbound application contract. |
| [Selection service](../../../../backend/src/main/java/com/adaptlearngraph/learning/application/TargetRoleSelectionService.java) | `getCurrentSelection` / `chooseTargetRole`: trusted actor, catalog, store and transaction ports. |
| [Command processor](../../../../backend/src/main/java/com/adaptlearngraph/learning/application/TargetSelectionCommandProcessor.java) | Command processing, replay and transaction-dependent state changes. |
| [Role query service](../../../../backend/src/main/java/com/adaptlearngraph/catalog/application/TargetRoleQueryService.java) | Catalog query orchestration. |
| [Service tests](../../../../backend/src/test/java/com/adaptlearngraph/learning/application/TargetRoleSelectionServiceTest.java) | Focused application policy checks. |
| [Persistence integration tests](../../../../backend/src/test/java/com/adaptlearngraph/learning/infrastructure/TargetRoleSelectionPostgresIntegrationTest.java) | Disposable database transactions and replay checks. |
| [Production boundary tests](../../../../backend/src/test/java/com/adaptlearngraph/learning/api/TargetRoleSelectionProductionBoundaryTest.java) | Local-only versus production security boundaries. |
| [Architecture tests](../../../../backend/src/test/java/com/adaptlearngraph/architecture/HexagonalArchitectureTest.java) | Module/layer dependency enforcement. |

REQ-001 has historical local/demo adapters. Confirm current source before reusing them; configured actors and provisional assessment/pathway dependencies are not production authorization or complete Version 2 behavior.

## Frontend and UI Anchors

Use [app](../../../../frontend/src/app/), [features](../../../../frontend/src/features/) and [shared](../../../../frontend/src/shared/) ownership. Follow the closest feature's patterns.

| Reference | Reusable pattern |
| --- | --- |
| [Selection API](../../../../frontend/src/features/employee/target-roles/targetRoleSelectionApi.ts) | `prepareChooseTargetRoleCommand`, `getTargetRoleSelection`, `chooseTargetRole`; prepared idempotency and response validation. |
| [Selection queries](../../../../frontend/src/features/employee/target-roles/targetRoleSelectionQueries.ts) | `useTargetRoleSelection`, `useChooseTargetRoleMutation`; query/mutation and invalidation. |
| [Selection API tests](../../../../frontend/src/features/employee/target-roles/targetRoleSelectionApi.test.ts) | Isolated request/response tests. |
| [Selection flow tests](../../../../frontend/src/features/employee/target-roles/TargetRoleSelectionFlow.test.tsx) | Component workflow tests. |
| [Shared UI](../../../../frontend/src/shared/components/ui/) | Reuse PageHeader, StatCard, Button, Dialog and other controls. |
| [Typography](../../../../frontend/src/shared/components/typography/) | Shared Heading/Text conventions. |
| [Design system](../../../../frontend/DESIGN_SYSTEM.md) | Current visual conventions. |
| [Tokens](../../../../frontend/src/shared/styles/tokens.css) | Actual CSS variables; no hardcoded UI colors. |
| [UI-UX Pro Max skill](../../ui-ux-pro-max/SKILL.md) | Load for frontend design/interaction changes. |
| [UI styling skill](../../ui-styling/SKILL.md) | Load for relevant component/layout/styling work. |
| [Design system skill](../../design-system/SKILL.md) | Load when changing the design system itself. |

Recheck authorization and query-cache isolation for the current identity/organization contract; do not blindly copy a local/demo cache key. Runtime mock stores and browser-only success simulations are not integration evidence. Test doubles are permitted inside isolated tests.

## Verification References

| Reference | Purpose |
| --- | --- |
| [Testing index](../../../../documents/testing/README.md) | Current acceptance scope and historical-evidence distinction. |
| [Unit guide](../../../../documents/testing/unit/README.md) | Domain/application, API/security, architecture and component testing. |
| [Integration guide](../../../../documents/testing/integration/README.md) | Testcontainers, persistence, isolation and recovery. |
| [System guide](../../../../documents/testing/system/README.md) | Compose, browser flows and manual checklists. |
| [Frontend scripts](../../../../frontend/package.json) | Current test/build/lint commands and dependencies. |
| [Vitest configuration](../../../../frontend/vitest.config.ts) | Unit/component suite scope. |
| [Playwright configuration](../../../../frontend/playwright.system.config.ts) | Shared browser runner, environment overrides and artifacts. |
| [Existing browser flow](../../../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) | Browser/API assertions and fixture patterns; adapt only to approved behavior. |
| [Development Compose](../../../../compose.dev.yml) | Actual local topology, ports and service configuration. |

## Commands and Preconditions

These commands are references for the approved implementation/verification stages, not permission to start services during clarification. Replace test placeholders with actual relevant classes/files. Inspect prerequisites without printing secrets; never obtain passwords/tokens through the question tool.

| Working directory | Command | Prerequisites / scope |
| --- | --- | --- |
| Repository root | `.\backend\mvnw.cmd -f backend/pom.xml '-Dtest=<actual test classes>' test` | Java 21; existing focused tests. Quote Maven properties in Windows PowerShell. |
| Repository root | `.\backend\mvnw.cmd -f backend/pom.xml test` | Backend regression gate when relevant; Docker Desktop for Testcontainers cases. |
| `frontend` | `npm.cmd test -- <actual test path>` | Installed project dependencies; Vitest unit/component tests. |
| `frontend` | `npm.cmd run build` | TypeScript and Vite build. |
| `frontend` | `npm.cmd run lint` | Existing lint runner; distinguish unrelated baseline failures. |
| `frontend` | `npm.cmd run test:system:f02 -- <actual spec filename>` | Running approved test stack and Chrome. Despite the legacy script name, it uses the shared Playwright config. |
| Repository root | `docker compose -f compose.dev.yml up --build -d` | Approved local stack only; inspect existing containers/ports and retain data. |
| Repository root | `Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status` | Default local web proxy health check; use the actual chosen port. |

Playwright reads `SYSTEM_TEST_BASE_URL` (default `http://127.0.0.1:8088`) and `PLAYWRIGHT_CHROME_PATH` (installed Chrome fallback is defined in the config). It uses one worker, no retries, failure screenshots and retained failure traces. Inspect the config rather than duplicating machine-specific executable paths. Add deliberate desktop/mobile captures when required by the UI acceptance; record actual artifact paths.

Default development ports: web 8088, API 18080, PostgreSQL 15432, Neo4j Browser 7474 and Bolt 7687. Confirm the current Compose configuration. Reuse only a suitable existing test stack; if a port is occupied by something else, use approved alternative ports and configure the runner. Do not terminate another process or run `down -v`.

Store actual runs in the existing per-REQ documents under `documents/testing/unit/`, `integration/` and `system/`; reuse a suitable existing evidence file before creating one. Record acceptance IDs, date/environment, command, expected/actual outcome and Passed/Failed/Blocked/Not Run. Preserve historical runs. Documentation-only/customization work uses relevant reference, syntax and behavioral checks instead of inventing application-test evidence or product IDs.