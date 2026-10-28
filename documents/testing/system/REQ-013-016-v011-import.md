# REQ-013/016 — v0.11 import system and manual evidence

2026-10-28. Application: `http://127.0.0.1:28088/expert/modules`; Neo4j Browser: `http://127.0.0.1:27474/browser/`. Local Compose project `module-authoring-test`; data was upgraded in place with backup and protected extras, without deleting volumes.

Automated spec: `frontend/system-tests/REQ-013-neo4j-v011-import.spec.ts`. **1 passed**, 49.8s case / 56.8s total. Uses real API/database and the main Expert login, with no HTTP mocks. Verifies old `MOD-DE-J-MODEL-01` and new `MOD-FOCUS-CORE01-HIGH`, populated duration/price, graph version 0.11.0, exactly one PRIMARY, allowed difficulty, pending review with null reviewer and detail rendering. Screenshot `frontend/test-results/REQ-013-neo4j-v011-import.png` was visually inspected.

## Manual checklist

Prerequisites: running local stack, imported v11 catalog, existing main Expert login. Reviews remain pending unless genuinely approved through the authoring workflow.

| Step | Action | Expected / observed |
|---|---|---|
| 1 | Reload Modules after the upgrade. | Verified interactively: shared login retained, Vietnamese page loads; current account has 249 merged/scoped rows. Raw graph has 259 Modules, including 13 protected authored ones. |
| 2 | Search `MOD-DE-J-MODEL-01`. | Verified interactively: `create data models — Guided implementation with supporting practice`, 450 minutes, 480000 VND, catalog version 0.11.0. |
| 3 | Open module detail. | Verified interactively: contentVersion 1.3 and `content/modules/MOD-DE-J-MODEL-01-single-primary.md`; primary `MS-DE01` LOW, supporting `MS-DE03`/`MS-DE06` LOW. No invented history/reviewer. |
| 4 | Search `MOD-FOCUS-CORE01-HIGH` and inspect it. | Automated browser passed: newly imported focused package, 405 minutes, 700000 VND, valid PRIMARY/HIGH and supporting/context mappings. |
| 5 | Inspect the import receipt and PostgreSQL preservation report. | Executed: full graph equals release plus protected extras; all 94 PostgreSQL table hashes/counts unchanged after restart; each of 259 Modules has one PRIMARY and positive duration/price. |
| 6 | Run guarded import planning again without `--apply`. | Executed: 0 node writes and 0 relationship writes; no new data or duplicates. |
| 7 | Restart the corrected seed/API. | Executed: seed exit 0; API and main-login module reads work with v11 while original bank/item pins remain unchanged. |

Backups, checksums, guards and recovery boundaries: [upgrade receipt](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md). This evidence certifies the local import and module display; it does not certify new catalog approval, arbitrary catalog migrations or automatic conversion of historical baselines to v11.
