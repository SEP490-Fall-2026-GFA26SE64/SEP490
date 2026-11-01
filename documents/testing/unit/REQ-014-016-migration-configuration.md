# REQ-014 / REQ-016 — migration configuration checks

2026-11-01: **2 passed**, compiled from the current `MigrationConfigurationTest.java` and invoked through a temporary standalone harness with JDK21/cached dependencies. Log: `/tmp/sep490-migration-resolution/config.log`.

- Each selectable location contains exactly one migration for each V1–V42; duplicate version numbers fail.
- Strict YAML parsing confirms the workspace profile defaults to the workspace lineage and supports explicit location selection.

The first run exposed URL-encoded spaces in the test's resource-path handling; changed it to `Path.of(resource.toURI())`, then reran both cases successfully. Full project compilation remains blocked by unrelated merge conflicts. These two checks do not replace application/API unit tests.

[Real PostgreSQL upgrades](../integration/REQ-014-016-migration-lineages.md).
