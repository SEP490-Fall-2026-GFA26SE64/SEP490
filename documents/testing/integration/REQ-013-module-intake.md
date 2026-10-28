# REQ-013 / REQ-053 — Per-module catalog intake

Disposable PostgreSQL 17.6-alpine + Neo4j 5.26-community; V27 and V28 migrations. Test: `ModuleAuthoringIntegrationTest#readsGraphCatalogWithoutAuthoringHistoryAndMapsEverySchemaField`.

Fixture covers all 13 Module properties and 8 TEACHES properties with source endpoints. Intake stores/reloads the exact source, same Module/mapping IDs, null original creator, actual assignment/receiver actors and timestamps, real bundled Markdown, complete draft, unchanged graph before approval, duplicate/scope/delete denial, submit/release and reviewer projection. Guards cover external graph drift, idempotent publication confirmation, forbidden content paths, external URLs and missing files.

Initial two-test authoring integration run passed (468.5s). Subsequent focused snapshot/publication guard run passed (111.0s). Final organization-boundary guard run passed (218.4s, 1 test, 0 failures/errors/skips). One intervening attempt timed out in the default Neo4j HTTP startup wait before assertions; fixture now waits for the Started log and caps container JVM processors at 2. Actual Bolt queries and all persistence assertions passed after readiness.
