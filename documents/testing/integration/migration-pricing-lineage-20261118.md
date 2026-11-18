# Pricing V67 / assessment migration reconciliation — 2026-11-18

The user confirmed deployed demo pricing is already 4,900 VND. The canonical source preserves `V67__demo_subscription_prices.sql` unchanged. Independent assessment context, learner ownership and shared Skill scope move from V67/V68/V69 to V71/V72/V73, respectively, in their existing lineages. Module ownership remains V70. All affected SQL bodies were compared byte-for-byte with HEAD and are unchanged. The former demo-to-V71 local-only proposal is withdrawn.

Verification uses `PricingMigrationLineageTest` on disposable PostgreSQL 17.6 containers, filesystem resources (not stale target resources), and `MigrationVersionUniquenessTest` across all three source lineages. Targeted Java 21 javac and Maven Surefire are used because unrelated legacy test compilation is outside this slice.

Scenarios:
1. Start with canonical workspace migrations through V67 demo pricing; upgrade to latest, preserve installed history/checksums, record demo pricing exactly once, validate and rerun with zero migrations. The local repair script must reject this history without modifying it.
2. Reconstruct the old local workspace lineage with independent V67, ownership V68, shared scope V69 and module owner V70; apply the guarded local history script, preserve installed ranks/checksums, run canonical migrations once with outOfOrder enabled (only previously absent demo V67 executes), validate and rerun with zero migrations.
3. All three canonical source lineages have unique normalized Flyway versions.

Actual final result: Passed, 2 PostgreSQL tests and 3 uniqueness checks, zero failures/errors/skips. The exact guarded script was executed successfully on legacy local history and rejected canonical deployed history. See `/tmp/sep490-migration-collision/final-script-lineage.log`. `git diff --check` passed. Earlier equivalent SQL rehearsal is retained in `final-lineage.log`.

Operational boundary: no real local/VPS database writes, no restart, commit, push or deployment. Local history currently still uses the former assessment numbers and requires backup plus `deploy/scripts/reconcile-local-assessment-history.sql` before migrating with new source. The script preserves checksums; it does not run assessment SQL again. The following migration run applies the previously absent local demo pricing once. Restore outOfOrder=false afterwards. Never run this local repair on the VPS with V67 demo pricing.

VPS acceptance remains unverified: the user confirmed the deployed price, but the complete server history has not been retrieved. A VPS with additional conflicting migration history needs inspection before rollout. No application UI or domain behavior changed; browser testing is not applicable.
