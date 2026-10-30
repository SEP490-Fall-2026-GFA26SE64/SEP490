# Controlled DRAFT import operation

Executed locally after explicit cleanup authorization; first run135 created, exact rerun0 created/135 existing; see [readback](local-readback.json). Normal administrator mode remains available; local seeding does not implement a production import feature. Read [contract](IMPORT_CONTRACT.md), [release pins](release-manifest.json) and [open prerequisites](SOURCE_REVIEW.md) first. Do not point normal Compose startup at this operation or run the old seed command.

## Required trusted configuration

Build the main backend artifact only with `mvnw.cmd -B -Dmaven.test.skip=true package` when packaging is needed; this follow-up built the main artifact with all test compilation/execution skipped. For normal administrator mode start with profile `question-bank-import` (not migrate/prod); for explicit local data seeding use `local,question-bank-import` and local-seed=true, `--question-bank.import.enabled=true`, and all properties below. The profile disables web/Flyway; no graph migration/seed is called. JDBC/Neo4j credentials come from the existing protected environment, not from this document.

| Property under question-bank.import | Required value/source |
| --- | --- |
| manifest-resource | classpath:db/seed/question-bank-15-1212.00-v1.json, or verified file: resource |
| manifest-version | information-security-analysts-en-v1 |
| expected-manifest-sha256 | release-manifest.json manifestSha256 |
| scope-resource | file: absolute path to catalog-scope.json in this directory |
| expected-scope-sha256 | release-manifest.json scopeSha256 |
| expected-source-sha256 | release-manifest.json sourceSha256 |
| occupation-id | OCC-15-1212.00 |
| bank-id | 2f79de6b-dc62-51a1-982d-0be9d6f588dc |
| owner-account-id | Existing active account in configured organization; normal mode additionally requires System Administrator |
| local-seed | Default false. true requires local/demo plus question-bank-import, excludes prod; existing creator FK only, no Admin granted |
| organization-id | Verified active organization of that account |
| expected-jdbc-url | Exact approved PostgreSQL JDBC target; compared with connection metadata |

Use the configured `spring.neo4j.uri`/authentication and, if needed, `spring.data.neo4j.database`. A configured Neo4j read-only credential is preferred; the operation uses read access and only MATCH queries. No tenant entitlement is inferred from missing graph organization properties. Verify operator authority and the intended environment before enabling import. No fake UUID is provided for owner/organization.

## Expected behavior and readback

The whole manifest and exact graph snapshot must validate first. Wrong hashes/versions/bank/Occupation or unreachable/drifted graph fail before INSERT. An existing active creator/tenant is locked/rechecked in the PostgreSQL transaction; normal mode additionally checks administrator role. The operation serializes by bank, with 10-second lock and 60-second statement timeouts. All bank/item identities and persisted fields are checked before any INSERT. The first successful operation creates one bank and 135 DRAFT versions; exact rerun reports zero created/135 existing. A conflict rolls back everything; no row is repaired/overwritten. Concurrent unique collision rolls back and requires investigation/retry of the same verified input. An unknown commit result is reconciled by an identical rerun.

After authorized import, use a read-only DB connection to compare bank name/creator/tenant and total/DRAFT/difficulty/skill counts, exact item IDs/versions/content hashes, plus safe manifest counts. Do not print protected_key, prompts or rationale to shared logs. Check original pinned/history data remains unchanged using an agreed existing-data evidence scope. The actual local readback is now recorded in local-readback.json. Exhaustive conflict/rollback/concurrency checks have not been performed. Do not mark acceptance Pass from this guide or compilation.

Publication is intentionally unavailable through this importer. If any existing version has since become PUBLISHED, a DRAFT rerun conflicts rather than changing state. New question content requires a new version and release hash, retaining every previous pin. Review approval, real Identity/Catalog permission integration, model policy/calibration and Session2/3 are prerequisites for new adaptive runtime readiness.
