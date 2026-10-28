# REQ-013/016 — v0.11 import unit evidence

2026-10-28. `python3 documents/dataset/import/test_dataset.py`: **31 passed**, 5.832s. `python3 documents/dataset/import/test_upgrade_neo4j_v011.py`: **7 passed**, 1.195s. Import dry-run validates 994 nodes, 5121 relationships, 246 Modules, 664 TEACHES pairs, complete schema fields, content files, one PRIMARY and source RIASEC data.

New guard tests verify exact v09-to-v11 planning, idempotent replanning, preservation of separately authored data, no mutation of the input snapshot, refusal of unknown nodes/relationships, reviewer drift, missing base records, catalog/authoring ID collisions and non-loopback endpoints. Python compilation passed. No fake reviewer/editor/revision values are added.

The bootstrap change is verified with a real PostgreSQL test in [integration evidence](../integration/REQ-013-016-v011-import.md). Existing publication/revision unit tests were not rerun because the data upgrade does not change those application rules. Focused lint passed for the new browser spec.
