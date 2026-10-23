# Neo4j ontology 0.9.0

The active ontology contract is defined in `documents/neo4j_schema.md` and `documents/dataset/ONTOLOGY.md` at the repository root. It has six node labels and seven relationship types. Course is retired. LearningModule TEACHES MicroSkill is many-to-many; skill prerequisites retain only requiredScore plus common metadata.

V1–V3 are immutable historical migrations: their checksums may already be recorded in a database. V4 removes the Course ID constraint without deleting any data. The migration runner is schema-only and does not import or transform a catalog. Legacy JobDomain/MacroCompetency constraints remain for the existing legacy API; they do not define the current ontology.

Use `documents/dataset/import/import_neo4j.py` for a validated import into an empty isolated graph. The importer does not overwrite an existing legacy/v0.7 database. It validates module/skill teaching coverage and duplicate pairs, prerequisites, fields and source-backed occupation values. A future write API must preserve these invariants in each transaction.

Legacy catalog APIs and cross-store role references still require a separate domain migration before operating on the new catalog. The development fixture rejects Occupation-based graphs. Do not run the legacy application against the isolated review dataset. Historical assessment evidence must remain attached to its original release; copying scores to the new module IDs is not a valid migration.
