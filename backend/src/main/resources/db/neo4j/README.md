# Neo4j ontology 0.9.0 — many-to-many teaching

User-authorized local cutover on 2026-10-22 replaced the backed-up Backend P3/Platform P4 fixture with the official documents/dataset/import/ontology_seed.json:827 nodes/4536 relationships. Six official node-ID uniqueness constraints are created by that package's importer. No SchemaMigration/JobDomain/MacroCompetency/Course seed is active.

Historical V1–V4 graph scripts and GraphSchemaMigrator are now only in src/test scope for an existing legacy compatibility test; production migrate startup cannot load them. DevelopmentCatalogSeeder/DevelopmentTargetSelectionSeeder and obsolete fixture-only checks are removed. Legacy graph CRUD controllers require explicit catalog.legacy-api.enabled=true and must never be enabled against the official graph until their owner aligns the schema. Read adapters still need authoritative review/permission integration; no fabricated fields are added to official nodes.

See documents/dataset/question-bank/15-1212.00/LOCAL_CUTOVER.md for source/data backups, approved replacement and actual migration/import observations. Earlier Session1 notes below are historical and superseded by this explicit cleanup authorization.

Session1 (2026-10-22): the already-seeded official graph is an external read-only dependency for question-bank preparation/import. DatabaseInitialization no longer invokes GraphSchemaMigrator or DevelopmentCatalogSeeder. Do not run a graph import, clear or reseed to prepare the bank. The importer checks the exact selected snapshot and fails on missing/drifted/unreachable data; see documents/dataset/question-bank/15-1212.00/IMPORT_CONTRACT.md. Guidance below about creating an isolated graph is historical import documentation, not Session1 execution authority.

The active ontology contract is defined in `documents/neo4j_schema.md` and `documents/dataset/ONTOLOGY.md` at the repository root. It has six node labels and seven relationship types. Course is retired. LearningModule TEACHES MicroSkill is many-to-many; skill prerequisites retain only requiredScore plus common metadata.

V1–V3 are immutable historical migrations: their checksums may already be recorded in a database. V4 removes the Course ID constraint without deleting any data. The migration runner is schema-only and does not import or transform a catalog. Legacy JobDomain/MacroCompetency constraints remain for the existing legacy API; they do not define the current ontology.

Use `documents/dataset/import/import_neo4j.py` for a validated import into an empty isolated graph. The importer does not overwrite an existing legacy/v0.7 database. It validates module/skill coverage and unique teaching pairs, prerequisites, fields and source-backed occupation values. A future write API must preserve these invariants in each transaction.

Legacy catalog APIs and cross-store role references still require a separate domain migration before operating on the new catalog. The development fixture rejects Occupation-based graphs. Do not run the legacy application against the isolated review dataset. Historical assessment evidence must remain attached to its original release; copying scores to the new module IDs is not a valid migration.

2026-10-26: the checked-in source is now v0.9.0 (833 nodes/4638 relationships, 85 Modules, 79 skills, 181 TEACHES mappings). The 22 October cutover above is historical v0.8 evidence. Do not overlay existing data or alter historical learner pins; the importer accepts only empty or exactly identical graphs.
