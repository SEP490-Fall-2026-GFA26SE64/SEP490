# REQ-016-F01/F02 — many-to-many teaching unit evidence

Date: 2026-10-26. Approved rule: a Module can teach several MicroSkills and a skill can have several provider Modules; every release Module/skill has coverage and each endpoint pair is unique. Module completion is not evidence that every linked skill passed.

## Scope and execution

- `python3 documents/dataset/import/test_dataset.py`: **13 passed**. Covers both multiple-provider directions, orphan Module/skill rejection, duplicate pairs, retained source mappings, every entity/edge property inventory, nonblank business fields, preserved non-Module business data, retired fields/Course rejection and prerequisite cycle/threshold validation. Nullable unreviewed metadata is asserted null rather than fabricated.
- `python3 documents/dataset/import/import_neo4j.py --dry-run`: **passed**,833 nodes/4638 relationships and30 source RIASEC values.
- `ManyToManyCatalogContractTest`: **2 passed**. The v09 envelope validates the15-skill baseline scope and all byte hashes. All135 original question items, IDs, versions, bank identity and content hashes remain equal. Historical calibration loads the exact original CRLF v08 pins and135 items.
- `HexagonalArchitectureTest`: **3 passed**. No unauthorized module/layer dependencies introduced.
- Workbook readback: all six entity sheets and seven relationship sheets exactly equal JSON records, including optional null fields. Changed LearningModules/TEACHES views were rendered and visually inspected. Diagram source/SVG/PNG regenerated together using PlantUML1.2025.10; both teaching cardinalities show1..*.

The final backend verification uses a clean Maven package to avoid stale resources from another branch. See [integration](../integration/REQ-016-many-to-many-teaching.md) and [system/manual evidence](../system/REQ-016-many-to-many-teaching.md) for runtime limits. No new DTO, graph property or PostgreSQL migration was added.
