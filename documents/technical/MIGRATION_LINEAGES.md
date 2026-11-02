# PostgreSQL migration lineages after Question Bank / Learning Module integration

Updated 2026-11-01. Source reconciliation and read-only installed-history validation are complete. The later accounts deployment/recovery receipt is tracked separately.

Flyway versions identify changes within one history. These three histories must never be combined in one `locations` list or selected interchangeably for an existing database.

| Location | Existing history preserved byte-for-byte | Appended changes | Selection |
| --- | --- | --- | --- |
| `classpath:db/migration` | Question Bank canonical V1–V29 | V30–V34 registration/subscription/identity; V35 workspace baseline resources; V36–V41 module/content; V42 pathway order/remove; V43 guarded development integration fields | Application default without workspace profile |
| `classpath:db/workspace-migration` | Question Bank workspace V1–V36, including Question Bank V36 | V37–V42 module/content; V43 guarded development integration fields | `workspace-baseline` default; shared `compose.dev.yml`; Question Bank isolated stack |
| `classpath:db/module-migration` | Learning Module V1–V41, matching the accounts database history | V42 Question Bank; V43 guarded development integration fields | `WORKSPACE_MIGRATION_LOCATION=classpath:db/module-migration` in `compose.accounts-dev.yml` |

The accounts artifact previously packaged this third history under `db/workspace-migration`. The new directory gives it an unambiguous identity. All 42 SQL resources match that existing artifact byte-for-byte; no applied checksum is rewritten. The application schemas, entity fields, Neo4j schema and store responsibilities are unchanged by this reconciliation.

The `workspace-baseline` profile accepts an explicit `WORKSPACE_MIGRATION_LOCATION` and defaults to the workspace history. Local-only registration key defaults and existing Compose key overrides are retained. Non-local registration key configuration remains unchanged. Existing learning-content dependencies/resources and asset/mail settings from Learning Module are retained; this does not establish that every deployment has a configured asset service.

## Before a future deployment

1. Back up the database and identify the exact current history, not just its latest version:
   ```sql
   SELECT version, description, checksum, success
   FROM public.flyway_schema_history
   ORDER BY installed_rank;
   ```
2. Match the whole installed prefix to one location above. Two databases can both report V36 while containing different migrations.
3. Validate that location against the database using Flyway before applying new migrations. Stop on a mismatch; do not use `repair`, baseline, out-of-order migration or volume deletion to hide it.
4. Build and deploy only after the remaining Java/frontend merge conflicts and integration checks are resolved. The user later explicitly authorized the8088 update; all42 installed migrations validated and startup required no migration. This does not authorize selecting a different lineage for another database.

[Verification and limits](../testing/integration/REQ-014-016-migration-lineages.md). Existing tables/data and prior migration resources are retained. Files from the incoming history that occupied conflicting version numbers are represented under the appropriate location and appended version; their SQL content is unchanged.

## Accounts deployment boundary — 2026-11-01

The full product artifact validated the existing Module lineage42/42 with0 pending; old artifact SQL resources and the new explicit directory match byte-for-byte. Accounts Compose also disables both catalog and workspace development seeds. The first deployment exposed a default-on local bootstrap. User-authorized recovery is now complete, and API has restarted with both seeds explicitly disabled. V42 validation/no-migration and post-restart data/referential checks passed; full merged browser mutation acceptance remains separate. [Exact backup, smoke and recovery status](../testing/system/REQ-013-014-merge-resolution.md#authorized-seed-recovery-and-restart--2026-11-01). No Flyway repair/baseline/outOfOrder or data-volume deletion was used.

## Latest main merge — source V43 (2026-11-01)

Latest main carries `V37__development_integration_bypass.sql`. In this combined branch workspace V37 already means Module authoring. Keeping both files under V37 is invalid; replacing the applied Module migration would also be invalid. The incoming SQL is retained byte-for-byte as `V43__development_integration_bypass.sql` in all three combined locations. Existing V1–V42 SQL/checksums remain unchanged. New source histories are continuous1–43. The subsequent user-authorized accounts8088 update validated the installed Module V1–V42 prefix and exactly one pending V43, then applied only V43. All144 prior table projections and the full graph matched the immediate backup after restart; no automatic seed ran.

V43 adds `organization_registration.email_verification_bypassed` and `mfa_bypassed` (non-null booleans defaultfalse), plus nullable `payment_order.development_bypassed_at` and the upstream truth constraints/status allowance. These fields record explicit development bypass decisions; no seed or bypass is activated by the migration. Existing local bootstrap-off configuration remains in place.

An upstream-main database that already applied main's original V37 is **not** interchangeable with this branch's workspace V37. Identify the whole installed history before choosing a location; this source resolution does not authorize migrating that fourth historical prefix or repairing checksums. The separate authorized accounts8088 update is limited to the verified Module history. [Current test receipt](../testing/integration/REQ-001-013-014-main-20261101.md).
## Workspace catalog import — V47 (2026-11-02)

`V47__workspace_catalog_import.sql` is identical in `db/migration`, `db/workspace-migration` and `db/module-migration`. It adds `platform.registration_catalog_selection` (one row per registration: template version/sha256 and 1–300 selected platform node ids) and `platform.workspace_catalog_import` (one row per organization: state PENDING/SUCCEEDED/FAILED, attempts, next attempt and lease, template version/sha256, copied node/relationship counts, failure code). No existing rows are changed; organizations provisioned before V47 have no import row and keep their current readiness. [Architecture](../ARCHITECTURE.md#multi-organization-workspaces-and-starter-catalog--2026-11-02).