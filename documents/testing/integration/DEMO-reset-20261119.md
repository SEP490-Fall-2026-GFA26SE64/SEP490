# DEMO: Reset Demo Data API (Integration Evidence)

**Date:** 2026-11-19. **Scope:** demo tooling (no product REQ ID). `POST /api/v1/demo/reset` removes every organization except the seeded TechNova organization, plus its accounts, invitations, registrations, org-scoped rows, Neo4j nodes and MinIO objects. Local/demo slice only; it is not profile-gated and must not be exposed on environments with real data.
**Owners:** `backend/src/main/java/com/adaptlearngraph/apis/DemoResetController.java`, `services/DemoResetService.java`, `repository/DemoResetStore.java`, `config/DemoResetConfiguration.java`, `dtos/DemoResetResultDto.java`.

## Acceptance Criteria

| ID | Criterion |
| --- | --- |
| DR-01 | Anonymous `POST /api/v1/demo/reset` succeeds (no session/CSRF) and responds `Cache-Control: no-store`. |
| DR-02 | Non-seed organizations, their accounts, registrations and org-scoped rows are deleted; TechNova and platform/seed accounts remain. |
| DR-03 | Neo4j nodes and MinIO objects owned by removed organizations are deleted; failures are reported as `warnings`, not as HTTP errors. |
| DR-04 | A repeated reset is a no-op (all counts 0). |

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Integration (Testcontainers) | `.\mvnw.cmd -o -f pom-it.xml test -Dtest=DemoResetApiIntegrationTest` (from `backend`) | **Passed:** 1 test, 0 failures (DR-01, DR-02, DR-04) |
| Architecture | ArchUnit layered-package checks | Passed |

`pom-it.xml` was a temporary, uncommitted copy of `pom.xml` with `failOnWarning=false`. The normal test compile is **Blocked** by an unrelated `-Werror` failure: deprecated `@MockBean` in `OrganizationKnowledgeGraphControllerTest.java:24` (also on `origin/main`). DR-03 is covered by the system run in [DEMO-reset-replay-20261119.md](../system/DEMO-reset-replay-20261119.md), where `graphNodesRemoved` > 0 and `warnings` = `[]`.
