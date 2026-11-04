# TECH — Persistence refactor: system smoke, API contract and performance

Date: 2026-11-03. Scope: persistence/DTO refactor (no product REQ). Frontend source unchanged.

## Environment

Isolated Compose projects on the multi-organization test ports (`compose.dev.yml` + `compose.multi-org-test.yml`): API `http://127.0.0.1:18096`, web `http://127.0.0.1:8096`, PostgreSQL `127.0.0.1:15447`, own volumes. `alg-orm-before` was built from the baseline commit 998f675 (worktree), `alg-orm-after` from the refactored tree. The development stack was not touched and no volume was reset. Statement logging (`log_statement = all`) was enabled only on these isolated databases.

## Checks

| Check | Command / procedure | Result |
| --- | --- | --- |
| Frontend build | `cd frontend; npm run build` | Passed (exit 0; existing chunk-size warning only) |
| Multi-organization smoke | `SYSTEM_TEST_BASE_URL=http://127.0.0.1:8096 npx playwright test --config=playwright.system.config.ts system-tests/REQ-060-061-multi-org-workspace.spec.ts` against `alg-orm-after` | **8 passed** (5.5 min): catalog subtree copy into a new workspace, slug/organization isolation at 1440px and 390px, signed-out deep link, and Admin/Expert/Manager/Employee navigation staying in the workspace |
| API contract | Same requests against before and after; SHA-256 of each response body | All 8 list endpoints byte-identical (`platform-catalog` content is non-deterministic run to run on either stack, but matched the baseline run). `question-bank` returns 409 for every available actor on both stacks (N/A) |
| API errors | `docker logs alg-orm-after-api-1` after the smoke | No ERROR/exception lines |

## Performance (p50 / p95 ms, 150 runs per endpoint after warm-up, measured inside the Compose network)

Before and after were measured back to back on the same machine. "Data statements" counts PostgreSQL SELECT/INSERT/UPDATE/DELETE per request (no BEGIN/COMMIT or background workers; minimum of 3 runs).

| Endpoint | Status | p50 before / after | p95 before / after | Data statements before → after |
| --- | --- | --- | --- | --- |
| `/api/v1/workspace-auth/current` | 200 | 25.7 / 28.2 | 41 / 43.2 | — |
| `/api/v1/platform-catalog` | 200 | 20.6 / 20.4 | 33.4 / 27.2 | 3 → 3 |
| `/api/v1/module-management/modules` | 200 | 28.0 / 34.5 | 49.3 / 51.2 | 12 → 13 |
| `/api/v1/module-management/module-list` | 200 | 55.6 / 59.3 | 76 / 93.9 | 14 → 15 |
| `/api/v1/organizations/{org}/job positions` | 200 | 50.2 / 52.4 | 148.4 / 131.4 | 11 → 13 |
| `/api/v1/organizations/{org}/target-roles` | 200 | 40.6 / 41.7 | 59.3 / 87.1 | 11 → 12 |
| `/api/v1/organizations/{org}/micro-skills` | 200 | 45.8 / 48.1 | 80.5 / 72.3 | 11 → 13 |
| `/api/v1/organizations/{org}/modules` | 200 | 47.1 / 49.6 | 113 / 70.3 | 11 → 13 |
| `/api/v1/organizations/{org}/prerequisites` | 200 | 38.6 / 42.5 | 52.5 / 65.8 | 11 → 13 |

Findings:

- **No N+1:** statement counts do not depend on row counts; the +1/+2 statements are a constant per-request identity/session lookup (visible as +2.5 ms on `workspace-auth/current`). Neo4j list reads issue one Cypher statement each (asserted in `Neo4jCatalogTenantIsolationIntegrationTest`).
- **Regression found and fixed:** the first after-measurement was 10–25 ms slower on Neo4j-backed lists because SDN wrapped each formerly auto-commit read in explicit BEGIN/COMMIT. Bolt tracing confirmed the extra round trips; commit 26d6d54 restores auto-commit reads (RUN/PULL only), giving the table above (+1 to +6.5 ms p50).
- p95 values vary by ±30 ms between runs on Docker Desktop and are not a reliable regression signal.

## Manual checklist (reproduce)

1. `docker compose -p alg-orm-after -f compose.dev.yml -f compose.multi-org-test.yml up -d --build` (ports above must be free; stop other multi-org projects first).
2. Wait for `http://127.0.0.1:18096/actuator/health` = 200 and `http://127.0.0.1:8096/` = 200.
3. Run the Playwright command above; expect 8 passed.
4. Sign in as `admin@technova.com` and open the workspace catalog pages; lists match the baseline stack.
5. `docker compose -p alg-orm-after -f compose.dev.yml -f compose.multi-org-test.yml stop` (keep volumes).
