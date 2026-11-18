# REQ-013 — local API recovery, 2026-11-18

**Recovered:** localhost:8088 API proxy, existing PostgreSQL, Neo4j and module responsibility route. This is machine-specific operational evidence, not a fresh-install/full-suite certification.

Failure: updated API exited JPA schema validation because platform.learning_notification lacked deep_link. Existing Neo4j container was stopped. The database's older migration numbering also differed from current source: stored V64 password reset, V65 independent assessment context and V66 learner ownership corresponded by exact Flyway checksum to current V65, V67 and V68. All other applied migration identities matched. Blindly enabling migration would fail validation; no reset/repair/baseline was used.

User approved backup, isolated rehearsal, verified live reconciliation and existing-service restart. PostgreSQL custom-format backup was successfully restored into an isolated temporary container. Guarded updates reconciled only the three proven version/script mappings, preserving checksums and historical installation metadata. Current backend applied missing V64 timing/notifications, V66 registration contact/consent and V70 module responsibility using a one-shot out-of-order migration run. Rehearsal and live migration exited 0 and passed JPA schema validation.

Preservation: restored copy matched original across 180 platform tables. After both rehearsal and live upgrade, all counts and normalized hashes matched pre-upgrade business data, excluding only newly added nullable columns and the new module responsibleExpertId field. Comparisons occurred before API traffic resumed; normal sign-in activity afterward can create session/security records.

Existing local Compose was updated in place to enable Flyway on API startup. It does not permanently enable out-of-order migration or add another permanent application stack. Existing Neo4j was restarted without replacing its volume. Three temporary rehearsal/migration containers were removed after verification.

## Actual checks

| Check | Result |
| --- | --- |
| API / Neo4j container health | Both running healthy |
| GET /api/v1/system/status through localhost:8088 | 200 |
| Existing L&D Manager sign-in and module session | 200 |
| GET module MOD-SEC01-ADVANCED-01 | 200 |
| GET eligible Expert directory | 200, one eligible Expert |
| GET module directory | 200 |
| PUT responsibility route with empty Expert ID | 400 validation, not 404; module document unchanged |
| Real ownership transfer on user's module | Not Run; left for user |
| Browser/Playwright | Not Run per user's standing instruction |

Backup, SHA/size manifest, original history, guarded reconciliation SQL, migration logs, table hashes and HTTP results are kept privately under `local/api-recovery-20261118/`. No credentials are included in this evidence. No commit or external deployment was performed. Shared `compose.dev.yml` remains the tracked startup definition; the machine's ignored API-only Compose is not part of a merge into main.
