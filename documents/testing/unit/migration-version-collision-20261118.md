# Duplicate V67 migration — 2026-11-18

## Superseded local-only attempt

The demo-to-V71 rename below was reversed after the user confirmed deployed pricing is already 4,900 VND. It must not be deployed. Current source retains demo pricing at V67 and moves independent context / ownership / shared scope to V71 / V72 / V73 respectively. SQL bodies are unchanged. Real local assessment history still needs guarded reconciliation before using the new source; the prepared script is `deploy/scripts/reconcile-local-assessment-history.sql`. It is not for a VPS with demo V67 installed.

Local PostgreSQL history was read from `adapt-learn-graph-dev-postgres-1`: V67 is `independent_skill_assessment_context`, V68 ownership, V69 shared scope and V70 module responsible expert; all successful. The existing API container is healthy and validated 70 migrations at startup. VPS history is unavailable.

Renamed `V67__demo_subscription_prices.sql` to `V71__demo_subscription_prices.sql` in migration, workspace-migration and module-migration. SQL bytes match HEAD exactly; no installed local migration was renamed or edited. V71 will apply the demo price reduction on the next migration run; it has not been applied by this task.

Verification:
- Added `MigrationVersionUniquenessTest` using Flyway's version normalization across all three source directories.
- Before: 3 failures, each identifying the duplicate V67.
- After: 3 passed, 0 failures/errors/skips via targeted javac compilation and `bash mvnw -q -Dtest=MigrationVersionUniquenessTest surefire:test` on Java 21.
- All three renamed SQL files compared byte-for-byte with their former tracked paths: identical.
- `git diff --check`: passed.
- Database upgrade rehearsal / rebuilt local runtime: not run. No database writes, restart, commit, push or deployment.

Deployment gate: read VPS Flyway history before publishing. If VPS already records V67 demo pricing, this local-compatible numbering is not compatible with that history; do not deploy it as-is or rerun pricing. Preserve installed history and prepare a separately reviewed reconciliation.

Task brief and logs: `/tmp/sep490-migration-collision/`. Runtime/UI behavior beyond the reported migration collision remains unverified; request the local error log if it persists after the source correction.
