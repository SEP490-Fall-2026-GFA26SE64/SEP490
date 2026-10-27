# REQ-016-F01/F02 — OC diagram and dataset manual checks

Date: 2026-10-27. Local data/schema checks: passed (24 unit tests, importer dry-run, all 13 graph worksheets equal JSON). Diagram PlantUML/SVG/PNG regenerated locally with PlantUML 1.2025.10 and Java headless mode. The PNG and workbook previews for Levels, LearningModules and TEACHES were visually inspected: new fields visible, Level context absent, OC note states independent values/no sum-to-one rule.

Full Compose, browser CRUD and Playwright v0.10 journeys: **not run**; the running application contract remains v0.9. These design/review artifacts do not certify API support or a deployed graph migration.

## Manual checklist

| Target / prerequisite | Steps | Expected |
|---|---|---|
| Local `documents/diagrams/neo4j.svg` or `.png`; image viewer | Zoom into Level, LearningModule and TEACHES | No context on Level; duration in minutes and price in VND on Module; numeric OC on TEACHES; N–N cardinality and independent OC note visible |
| `documents/dataset/ontology_dataset.xlsx`; spreadsheet viewer | Inspect Levels, LearningModules, TEACHES and Rubric Guide | 144 Levels without context, 85 Modules with numeric duration/price, 181 pairs with numeric OC; units/illustrative assumptions explained; review inputs retained |
| JSON `documents/dataset/import/ontology_seed-v010.json` | Compare the same IDs/values against workbook | Exact record equality; all required business fields populated; unreviewed reviewer metadata remains null |
| Optional isolated review graph; URL `http://localhost:7479/browser/`; follow [import guide](../../dataset/NEO4J_IMPORT_GUIDE.md) | Import v0.10 into an empty isolated graph, run OC/metadata inspection query and Level.context query | 833 nodes, 4,638 edges, duration/price/OC returned; unexpectedContext=0; no writes to existing runtime graph |
| Local regression fixture; no database required | Run import/test_dataset.py and import/import_neo4j.py --dry-run | 24 tests pass; 0.5+0.6+0.7 accepted; invalid OC/duration/price and retired Level.context rejected |

OC scoring/assignment rules remain deferred. OC now varies per Module–Skill pair; the same MS-DE06 has 0.2 in MODEL-01 and 0.5 in QUAL-01 (full Module IDs in the sample manifest). Values remain illustrative, not calibrated. The sample paid packages now have differentiated duration (150–915 minutes) and price (150,000–1,560,000 VND), awaiting expert review. See [estimation method](../../dataset/MODULE_EFFORT_PRICE.md). No runtime user journey is claimed.

Follow-up manual check (REQ-013-F01/F03): open LearningModules in the workbook and compare MOD-DE-J-MODEL-01 (450 minutes / 480,000 VND), MOD-DE-J-MODEL-02 (375 / 410,000) and MOD-DE-J-PIPE-01 (510 / 530,000). Expected: numeric values, positive prices, correct minute/VND formats. Compare Middle/Senior variants for deeper effort; inspect independent OC for the same skill across providers. The estimate manifest records all inputs and content hashes; worksheet/JSON equality is checked again after the edit.


Per-pair OC follow-up (REQ-016-F01/F02): MS-DE06 has 0.2 in MOD-DE-J-MODEL-01 and 0.5 in MOD-DE-J-QUAL-01 simultaneously. 181 existing TEACHES IDs/pairs have explicit illustrative values matching the retained per-pair manifest. The 24-test run covers both values surviving graph-payload serialization and exact sample-manifest equality. No new graph node or runtime API is introduced. Database round-trip/Compose/Playwright remain not run.

Manual prerequisite: open ontology_dataset.xlsx. Steps: open Outcome Coverage, find MS-DE06 and compare its Module rows with TEACHES. Expected: the two exact providers above display 0.2 and 0.5 respectively, formulas refer to their own relationship records, and Module/Skill names identify each pair. Open diagrams/neo4j.svg to inspect the TEACHES relationship-property box and example. Optional URL http://localhost:7479/browser/ with an isolated v0.10 import: run the same-skill comparison query in the import guide. Expected: both values coexist, with no node-global OC and no normalization. This is an available checklist, not an executed live database test.

OutcomeCoverage naming correction: renamed the TEACHES property to outcomeCoverage and comparison sheet to Outcome Coverage. The local 24-test run includes rejecting the retired property name. All 181 JSON/Excel pairs and 905 formula-linked comparison cells retain their values; duration/price estimates and legacy runtime pins remain unchanged. Manual check: open TEACHES column J and Outcome Coverage, confirm the new field/title and MS-DE06 values 0.2/0.5. No live migration or runtime API acceptance is claimed.
