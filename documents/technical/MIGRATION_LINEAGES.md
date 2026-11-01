# PostgreSQL migration lineages after Question Bank / Learning Module integration

Updated 2026-11-01. Source reconciliation and read-only installed-history validation are complete. The later accounts deployment/recovery receipt is tracked separately.

Flyway versions identify changes within one history. These three histories must never be combined in one `locations` list or selected interchangeably for an existing database.

| Location | Existing history preserved byte-for-byte | Appended changes | Selection |
| --- | --- | --- | --- |
| `classpath:db/migration` | Question Bank canonical V1–V29 | V30–V34 registration/subscription/identity; V35 workspace baseline resources; V36–V41 module/content; V42 pathway order/remove | Application default without workspace profile |
| `classpath:db/workspace-migration` | Question Bank workspace V1–V36, including Question Bank V36 | V37–V42 module/content | `workspace-baseline` default; shared `compose.dev.yml`; Question Bank isolated stack |
| `classpath:db/module-migration` | Learning Module V1–V41, matching the accounts database history | V42 Question Bank | `WORKSPACE_MIGRATION_LOCATION=classpath:db/module-migration` in `compose.accounts-dev.yml` |

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
