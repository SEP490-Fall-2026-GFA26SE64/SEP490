# REQ-002 Workspace Baseline - Schema and Persistence Evidence

Date: 2026-10-28. Delivery boundary: combined local development runtime, not production or actual-content certification.

## Migration lineage and preservation

| Acceptance | Procedure | Actual result |
| --- | --- | --- |
| Preserve existing V1-V12 | Read `public.flyway_schema_history` before change; keep those migration files unchanged | Passed: existing identity/subscription lineage was V12, all successful. |
| Resolve duplicate main versions | Append incoming assessment V8-V26 as V13-V31; add V32 tenant resource binding | Passed: no duplicate versions. A different already-applied main lineage still needs a separate migration design. |
| Recoverable backup | `pg_dump -Fc` of dev, copy outside repository, validate with `pg_restore --list` | Passed: custom archive, 292658 bytes. No credentials or backup contents committed. |
| Upgrade actual data copy | Restore to the separate `main_integration_upgrade_20261028` database; run the migrate image against that database | Passed, exit 0: V12 -> V32. |
| Row preservation | Compare count and canonical JSON aggregate hashes of organization, account, membership, membership_role, registration, plan_version, payment_order, subscription_period and target_selection between original dev and upgraded copy | Passed: all nine tables unchanged. No sensitive rows printed. |
| Fresh migration, idempotency and binding constraints | `WorkspaceBaselineResourcesIntegrationTest` with Testcontainers PostgreSQL | Passed: V12 -> V32 applies 20 new migrations; second run applies zero; original checksums/account organization preserved; nullable bank/model/mapping remain null; cross-tenant reference/bank rejected; inactive department hides binding without deleting it. |
| Existing baseline persistence/receipts | `RoleBaselinePostgresIntegrationTest` in final backend selection | Passed: 24 cases, including concurrency, immutable history, pinned attempts and isolated tenant/learner state. |
| Existing dev migration | `docker compose -f compose.dev.yml up -d --wait --no-build migrate api web` after the preceding checks | Passed, exit 0: dev history through V32; API healthy. |

The final combined backend selection passed 78 tests, including these persistence cases and ArchUnit; the separate corrected schema selection passed 7 tests. Counts overlap.

## Stored field and trust boundaries

- `workspace_baseline_resource` requires organization, same-tenant occupation reference and canonical graph occupation ID. Bank/model/mastery-mapping UUIDs may legitimately be null until configured.
- A foreign bank is rejected by the database owner guard; runtime also rechecks bank creator organization, published item versions and promoted model scope.
- Graph access is an explicit organization binding, not a grant inferred from an unowned graph node. Real review metadata is required; integration never generates reviewer identity/timestamps.
- Attempt ownership is the authenticated Employee account plus organization. Existing snapshots and permitted null result/profile fields remain intact.
- Historical UUID role selections are not rewritten. A visible reselection state distinguishes them from a current-schema selection.
- No graph reset/reseed, payment operation against a real provider, automatic content approval or production deployment occurred.

PostgreSQL diagrams were regenerated locally from V32: 113 tables. All five updated SVGs were rendered with the installed PlantUML JAR and XML-validated.

Cleanup: the named temporary upgrade-check database and container-side temporary dump were removed after verification. The original dev PostgreSQL/Neo4j volumes and the external recovery archive remain preserved.
