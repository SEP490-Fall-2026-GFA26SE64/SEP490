> Historical numeric-coverage evidence. Superseded for the current text field by [instructionLevel evidence](REQ-016-instruction-level.md). Earlier run results below retain their original numeric contract.

# REQ-016-F01/F02 — OC persistence verification boundary

Date: 2026-10-27. New v0.10 database round-trip/Testcontainers tests: **not run**. The request updates schema, diagrams and ontology review data; production/domain/API adapters and Compose remain pinned to v0.9. Docker access from the sandbox returned permission denied. No live database was changed and earlier v0.9 integration evidence is not v0.10 acceptance.

Local graph payload checks passed: every Module carries duration/price, TEACHES carries numeric outcomeCoverage, no Level carries context, and export-only joins are omitted. This checks serialization, not a database round trip.

For the future runtime upgrade, use an isolated `neo4j:5.26-community` fixture and import `ontology_seed-v010.json`; assert all 833 nodes/4,638 edges and exact property equality after readback, independent OC values 0.5/0.6/0.7, nonempty module fields and absent Level.context. Keep v0.9 baseline scope/envelope hashes, attempts and results unchanged. Tenant/catalog authorization remains an owner API responsibility, not established by dataset import.


Per-pair OC follow-up (REQ-016-F01/F02): MS-DE06 has 0.2 in MOD-DE-J-MODEL-01 and 0.5 in MOD-DE-J-QUAL-01 simultaneously. 181 existing TEACHES IDs/pairs have explicit illustrative values matching the retained per-pair manifest. The 24-test run covers both values surviving graph-payload serialization and exact sample-manifest equality. No new graph node or runtime API is introduced. Database round-trip/Compose/Playwright remain not run.

Manual prerequisite: open ontology_dataset.xlsx. Steps: open Outcome Coverage, find MS-DE06 and compare its Module rows with TEACHES. Expected: the two exact providers above display 0.2 and 0.5 respectively, formulas refer to their own relationship records, and Module/Skill names identify each pair. Open diagrams/neo4j.svg to inspect the TEACHES relationship-property box and example. Optional URL http://localhost:7479/browser/ with an isolated v0.10 import: run the same-skill comparison query in the import guide. Expected: both values coexist, with no node-global OC and no normalization. This is an available checklist, not an executed live database test.

OutcomeCoverage naming correction: renamed the TEACHES property to outcomeCoverage and comparison sheet to Outcome Coverage. The local 24-test run includes rejecting the retired property name. All 181 JSON/Excel pairs and 905 formula-linked comparison cells retain their values; duration/price estimates and legacy runtime pins remain unchanged. Manual check: open TEACHES column J and Outcome Coverage, confirm the new field/title and MS-DE06 values 0.2/0.5. No live migration or runtime API acceptance is claimed.
