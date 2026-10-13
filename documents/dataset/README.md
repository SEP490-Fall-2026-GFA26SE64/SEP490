# Role-centred ontology dataset

Current catalog: **0.3.1**. Assessment rubric: **1.1**.

This directory is the authoritative working copy for the ontology dataset. Start with the [review workbook](exports/ontology_v031_reviewed.xlsx), [field definitions and assessment rules](ontology_fields_review.md), and [dataset specification and source evidence](ontology_dataset_specification.md).

## Directory guide

| Location | Purpose |
|---|---|
| `ontology_v031_en.json` | Current English seed, including rubric configuration |
| `ontology_fields_review.md` | Entity fields, relationships, approval gates and scoring rules |
| `ontology_dataset_specification.md` | Framework basis, mappings, learning resources and evidence |
| `NEO4J_IMPORT_GUIDE.md` | Steps, embedded import example and queries for an isolated Neo4j review instance |
| `exports/` | Excel workbook for reviewing the current data |
| `content/modules/` | 72 module lessons and practice tasks |
| `content/topics/` | 12 shared introductory lessons |
| `sources/` | Retained official ESCO API snapshots and evidence manifest |
| `reports/` | Validation results and review-status change history |
| `reports/diagnostics/` | Workbook inspection output for troubleshooting |
| `releases/` | Self-contained ZIP for sharing with the team |
| `archive/` | Earlier v0.3 seed, foundation proposal and legacy import instructions |
| `outputs/` | Existing benchmark directories; separate from the current ontology release |

The catalog contains 4 roles, 12 levels, 36 competencies, 64 micro-skills, 36 courses, 72 modules, 224 graph nodes and 578 relationships. Scores range from 0 to 1; thresholds are local design decisions awaiting expert calibration.

All current records require expert review. `ACTIVE` alone does not authorize publication or official assessment. The field document defines the required approval checks. No database import, content upload or backend implementation is included.

Resolve each module `contentUri` relative to the directory containing `ontology_v031_en.json`. Provenance stays in the specification and source evidence, outside the database seed.

## Sharing and historical material

Use [ontology_v031_handoff.zip](releases/ontology_v031_handoff.zip) to share the current release. Its internal layout mirrors this directory, excluding archives, diagnostics, benchmark outputs and the release ZIP itself. `PACKAGE_MANIFEST.json` inside the ZIP records SHA-256 hashes of the packaged files.

The [legacy import README](archive/legacy_import_README.md) is retained as historical material. Its referenced importer and benchmark files are no longer present in this checkout; it is not an import procedure for ontology 0.3.1. Do not mix archived data with the current seed.
