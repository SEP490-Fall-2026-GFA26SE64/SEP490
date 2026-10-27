# Ontology 0.9 baseline compatibility — 2026-10-26

REQ-016-F01/F02 changes Module–Skill teaching to many-to-many. The active source has 833 nodes/4638 relationships (85 Modules,79 skills,181 TEACHES pairs). Definitions and teaching pairs are recovered from retained source evidence, not inferred from titles. Course stays retired; all definitions remain NEEDS_EXPERT_REVIEW.

## New local/demo envelope

- `catalog-scope-v09.json` contains the same eight Information Security Roles,24 Levels and15 required skills, plus all their competency/teaching trace. It has140 nodes/624 relationships.
- `backend/src/main/resources/db/seed/question-bank-15-1212.00-v1-ontology-v09.json` changes only the manifest/catalog/source/scope envelope pins. All135 items, protected content, IDs, versions, hashes, bank identity and DRAFT state equal the original v1.
- `release-manifest-v09.json` records the new byte hashes. LocalDemoSeedConfiguration verifies these pins and Compose mounts the v09 scope. `.gitattributes` fixes LF for new pinned source/envelope files.
- Original v08 manifests, observed cutover records and release sidecars remain historical. `historical/` retains the original Windows CRLF source/scope/manifest bytes matching the immutable calibration PIN. OfficialCalibrationBankSource reads those archived inputs, preserving old fitted/calibration provenance. No old model or attempt is repinned.

## Deployment and existing data

Normal startup cannot overlay an existing graph. A fresh/isolated graph can be seeded with v09; re-running the same seed validates the scope and does not add duplicate bank/items. An existing v08 graph fails the exact snapshot guard. Do not delete volumes or overwrite its graph to force startup. First back it up, review existing selections/attempts/profiles/pathways and arrange an explicit catalog cutover under the responsible owners. Source code/schema changes alone do not mean that a previously deployed database has changed.

The generic importer remains restricted to empty or exactly identical graphs. Uniqueness constraints do not enforce teaching coverage or unique endpoint pairs; the offline release validator checks both. Future catalog writes must enforce them transactionally along with authorization/review/publication rules.

See [unit/integration/system evidence and manual checks](../../../testing/system/REQ-016-many-to-many-teaching.md). This change does not implement the separate legacy Module management CRUD APIs or approve content.
