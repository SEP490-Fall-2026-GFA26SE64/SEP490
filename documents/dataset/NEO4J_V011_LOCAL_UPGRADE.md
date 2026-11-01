# Authorized local catalog upgrade to v0.11.0

Executed 2026-10-28 following the user's explicit request to update the running data and import v11. Target: Compose project `module-authoring-test`, Neo4j HTTP `127.0.0.1:27474` / Bolt `27687`, application `127.0.0.1:28088`. The original empty/identical importer remains unchanged.

## Source and resulting data

Source: `import/ontology_seed-v011.json`, SHA256 `a70540104d8250ae833310c8a654c2e25abda79b3b7074a390b51a8711e39f30`. Local validation and 31 dataset regression tests passed. The source JSON/workbook was already the current release and was not regenerated or rewritten.

| Inventory | Before | After |
|---|---:|---:|
| Catalog modules | 85 | 246 |
| Catalog TEACHES pairs | 181 | 664 |
| Separate authored modules preserved | 13 | 13 |
| Separate authored TEACHES preserved | 13 | 13 |
| Total nodes | 846 | 1007 |
| Total relationships | 4651 | 5134 |
| Total modules | 98 | 259 |

The exact catalog subset contains 994 nodes and 5121 relationships. All 259 runtime Modules now have positive duration/price, all 677 runtime TEACHES pairs have valid teachingFocus/difficultyLevel, and every Module has exactly one PRIMARY. Catalog definitions remain NEEDS_EXPERT_REVIEW; import does not approve content or create authoring history. The 13 authored modules retain their exact pre-upgrade properties and review records.

Original IDs, non-teaching business definitions, requirement thresholds, and prerequisites retain the release's compatibility contract. The current graph catalog version becomes 0.11.0. Old files and PostgreSQL package/item/learner pins are not rewritten. Existing baseline configurations still have their original catalog/version context; this is not a blanket certification of their compatibility with a new catalog.

## Recovery and preservation evidence

Private, Git-ignored backup directory: `local/ontology-v011/applied-20261028/` at repository root. Files have owner-only permissions:

- `graph-before.json`, `schema-before.json`: complete graph properties/endpoints and schema inventory.
- `postgres-before.dump`: complete PostgreSQL custom-format dump, validated with `pg_restore --list` without restoring it.
- `postgres-before.json`: counts and stable row hashes for all 94 `platform` tables.
- `backup-files.json`: byte lengths and SHA256 checksums of recovery files.
- `graph-after.json`, `receipt.json`, `post-restart-verification.json`: exact readback and preservation receipts.

Before graph digest: `f85a4560558aa1c15df8e6cde57957c530b6eaf7ea215fa14601e97201ef92e6`.
After graph digest: `2e4066888c6d6e5c1aac157ee823271f256ff1b518aa0bbba1bd450ffa54da3d`.

The API writer was stopped during backup/import. All changes were checked inside one Neo4j transaction before commit. The complete graph was checked again after commit and after API/bootstrap restart. All 94 PostgreSQL table counts/row hashes are unchanged, including Module revisions, grants, learner pins, question items, attempts, profiles and model records. Replanning the same upgrade reports zero node/relationship writes.

Recovery must use the preserved snapshot in a separate verified recovery instance first; stop writers and reconcile any newer writes before a cutback. Do not reset volumes or blindly downgrade historical pins.

## Guarded upgrade tool

`import/upgrade_neo4j_v011.py` uses the local Neo4j HTTP transaction API and Python standard library. It verifies loopback/container/project identity, exact v0.9/v0.11 source ownership, known authored extras, no authoring/catalog ID collision, a stopped API writer for apply, backup integrity, exact transaction readback and unchanged PostgreSQL rows. Unknown edits or real reviewer drift stop the operation instead of overwriting them. Its seven planning/endpoint guard tests passed.

Use a new backup directory for each invocation. Without `--apply` it only reads the databases and writes a plan. See the [import guide](NEO4J_IMPORT_GUIDE.md#authorized-upgrade-of-an-existing-local-v09-catalog).

## Existing-bank bootstrap correction

The old Compose bootstrap attempted to revalidate the frozen v09 question-bank scope against the newly current v11 graph and exited before starting the API. `OfficialQuestionBankImporter.verifyExistingManifest` now checks the existing bank owner and every item identity/content/state directly, without inserts or repair. A complete unchanged historical bank allows bootstrap to finish without reseeding the graph. Missing/conflicting items still fail closed; first-time bank creation retains the original catalog validation path.

The PostgreSQL Testcontainers integration case and three architecture rules passed. Rebuilt bootstrap exited 0 on the real stack, API restarted, and the full PostgreSQL fingerprint still matched. No migration, bank manifest, item content or historical version pin was changed.

## Browser verification

`REQ-013-neo4j-v011-import.spec.ts`: 1 passed, 49.8s case / 56.8s total. Checks main login, at least 246 visible catalog/draft rows, old and newly introduced module IDs, 0.11.0 metadata, populated positive duration/price, one PRIMARY, valid difficulty, pending review without fabricated reviewer, and detail UI.

Manual verification in the in-app browser confirmed Vietnamese labels and `MOD-DE-J-MODEL-01`: revised title, 450 minutes, 480000 VND, contentVersion 1.3, new `-single-primary.md` reference, PRIMARY/LOW and two SUPPORTING/LOW mappings. The account's unfiltered combined list showed 249 rows; this differs from raw graph totals because authoring scopes and unprojected drafts are applied.

[Structured manual checklist and evidence](../testing/system/REQ-013-016-v011-import.md).
