# Demo scenario data in English: Brightpath (2026-11-19)

**Scope:** Demo seed data and the scenario in [Demo/Demo.md](../../../Demo/Demo.md) are now in an English business context. Company `Brightpath Technologies Inc.`, workspace `brightpath`, country United States. Admin `Michael Carter`. The 3 imported users are Sarah Mitchell (L&D Manager), David Thompson (Domain Expert) and James Wilson (Employee, `JAVA-BE` / `Junior`). Emails are unchanged. The seeds were renamed to `01_Org_Structure_Brightpath.xlsx` and `02_Users_Brightpath.xlsx`. Demo.md prose stays Vietnamese. No application code changed.

**Environment:** Windows, Node/Vitest in `frontend/`, Python openpyxl.

| ID | Check | Procedure | Result |
| --- | --- | --- | --- |
| D-01 | Seed 01 keeps its structure after the description edit: 4 departments, 5 job positions, 5 roles, 14 levels; the ENG description says "Brightpath"; 13 data validations kept | Only `xl/sharedStrings.xml` rewritten (1 replacement). Parsed with the app's `parseStructureFile` (temporary Vitest script, removed); validations counted with openpyxl | Passed |
| D-02 | Seed 02 has the English org name and names, and the headers `Full name *, Email *, Role *, Department, Job position, Current role, Level`; 3 rows validate with 0 issues against a catalog built from seed 01 | Generated with `buildUserImportWorkbook`, then `parseUserImportFile` + `validateImportRows` (temporary Vitest script, removed) | Passed |
| D-03 | No Vietnamese text or "Sao Mai" left in `Demo/*.xlsx`, `Demo/Demo.md`, `frontend/src`, `frontend/system-tests`, `documents/features` | openpyxl cell scan + ripgrep | Passed |
| D-04 | Updated reset spec type-checks and is discovered | `npx tsc -b`; `npx playwright test DEMO-reset-replay.spec.ts --list` (2 tests) | Passed |
| D-05 | Seed 01 (rebuilt from #38, which added RIASEC columns) opens in Excel with Job positions data intact. #38's `sheet3.xml` used undeclared `x14ac` (rewritten as `ns1`–`ns3` prefixes), so Excel "repaired" the workbook and blanked the tab | Restored the standard `mc`/`x14ac`/`r` prefixes; checked all XML parts are well-formed; opened via Excel COM: Job positions `A1:J501`, A2 `ENG`, D2 `Backend Engineer`, E2 `18`. The original #38 file fails `Workbooks.Open` | Passed |
| S-01 | [DEMO-reset-replay.spec.ts](../../../frontend/system-tests/DEMO-reset-replay.spec.ts) end-to-end with the Brightpath values and a 3-user import | Requires the disposable `alg-demo` stack on port 8099. It is destructive and sends real invitation emails to the 3 Gmail inboxes | Not Run |

Historical evidence ([DEMO-reset-replay-20261119.md](./DEMO-reset-replay-20261119.md), [FR-03-01-user-import-current-role-20261119.md](../unit/FR-03-01-user-import-current-role-20261119.md)) refers to the earlier Sao Mai files and is kept unchanged.
