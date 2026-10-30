> Historical numeric-coverage evidence. Superseded for the current text field by [instructionLevel evidence](REQ-016-instruction-level.md). Earlier run results below retain their original numeric contract.

# REQ-016-F01/F02 — OC and module metadata

Date: 2026-10-27. Scope: v0.10 design/review dataset and isolated importer, no runtime API implementation.

Approved rules: numeric outcomeCoverage (OC) on each TEACHES pair; independent values with no sum-to-one constraint; duration/price on LearningModule; remove Level.context. Dataset conventions: finite OC [0,1], duration positive integer minutes, finite price >0 VND. Scoring rules deferred.

Executed `python3 documents/dataset/import/test_dataset.py`: **24 tests passed**. Checks exact field inventories/nonblank business fields, export-only joins, retained teaching coverage and sources, duplicate/wrong/retired fields, prerequisite validity, numeric OC and module metadata in generated graph properties. The three-skill fixture 0.5/0.6/0.7 validates with sum 1.8. Rejects missing OC, null/bool/string/nonfinite/out-of-range OC, invalid duration, zero/negative/nonfinite price and Level.context. Review identities remain null while unapproved; no reviewer is fabricated.

Executed importer `--dry-run`: **passed**, 833 nodes/4,638 relationships. All six entity sheets and seven relationship sheets read back equal the v0.10 JSON. Original v0.9 seed remains byte-identical to Git HEAD; no baseline pins changed.

All 181 OC values are explicit per-pair illustrative samples in [the retained manifest](../../dataset/sources/local_review/module_skill_oc_v010.json). MS-DE06 has 0.2 in MOD-DE-J-MODEL-01 and 0.5 in MOD-DE-J-QUAL-01. The 85 Modules now have duration 150–915 minutes and strictly positive price 150,000–1,560,000 VND; 31 durations and 54 prices are distinct. These are reproducible review estimates, not measurements or vendor quotes. See [method](../../dataset/MODULE_EFFORT_PRICE.md).

Follow-up verification for REQ-013-F01/F03: the 24-test run also checks exact reproduction from the retained effort/price manifest, positive amounts, 15-minute/10,000-VND rounding and increasing duration/price across Junior/Middle/Senior packages teaching the same skills. Invalid zero price is rejected. Runtime backend pricing/selection is not implemented or certified by these data checks.


Per-pair OC follow-up (REQ-016-F01/F02): MS-DE06 has 0.2 in MOD-DE-J-MODEL-01 and 0.5 in MOD-DE-J-QUAL-01 simultaneously. 181 existing TEACHES IDs/pairs have explicit illustrative values matching the retained per-pair manifest. The 24-test run covers both values surviving graph-payload serialization and exact sample-manifest equality. No new graph node or runtime API is introduced. Database round-trip/Compose/Playwright remain not run.

Manual prerequisite: open ontology_dataset.xlsx. Steps: open Outcome Coverage, find MS-DE06 and compare its Module rows with TEACHES. Expected: the two exact providers above display 0.2 and 0.5 respectively, formulas refer to their own relationship records, and Module/Skill names identify each pair. Open diagrams/neo4j.svg to inspect the TEACHES relationship-property box and example. Optional URL http://localhost:7479/browser/ with an isolated v0.10 import: run the same-skill comparison query in the import guide. Expected: both values coexist, with no node-global OC and no normalization. This is an available checklist, not an executed live database test.

OutcomeCoverage naming correction: renamed the TEACHES property to outcomeCoverage and comparison sheet to Outcome Coverage. The local 24-test run includes rejecting the retired property name. All 181 JSON/Excel pairs and 905 formula-linked comparison cells retain their values; duration/price estimates and legacy runtime pins remain unchanged. Manual check: open TEACHES column J and Outcome Coverage, confirm the new field/title and MS-DE06 values 0.2/0.5. No live migration or runtime API acceptance is claimed.
