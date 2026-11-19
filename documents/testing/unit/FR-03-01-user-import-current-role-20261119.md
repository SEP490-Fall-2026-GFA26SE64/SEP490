# FR-03.01 User import: "Target role" → "Current role" and demo seed 02 — unit evidence (2026-11-19)

**Scope:** [FR-03.01](../../features/Workspace%20administration/README.md#fr-03-01) bulk user import template. User-facing column/copy renamed to **Current role** (EN) / **Vai trò hiện tại** (VI); internal field and invitation payload unchanged; legacy "Target role" header still parsed. `Demo/02_Users_SaoMai.xlsx` regenerated with the updated builder: 3 users (L&D Manager, Domain Expert, Employee with Current role `JAVA-BE - Java Backend Developer` / `Junior`).

**Environment:** Windows 11, Node, Vitest 5.0.2, `exceljs`, local working tree.

| ID | Acceptance | Procedure | Result |
| --- | --- | --- | --- |
| U-01 | Users header row reads `… Job position, Vai trò hiện tại, Cấp độ` (VI) | `userImport.test.ts` › puts the Instructions tab first… | Passed |
| U-02 | Older files with the "Target role" header still map to the role field | › still reads the legacy "Target role" header… (new) | Passed |
| U-03 | Validation messages use "Current role" and "published or staged" | › enforces the department → job position → current role → level chain | Passed |
| U-04 | Other import behaviors unchanged | remaining 8 tests in `userImport.test.ts` | Passed |
| U-05 | Seed 02 parses and validates with 0 issues: 3 rows, Employee resolves to `JAVA-BE - Java Backend Developer` / `Junior` against a catalog of the 5 staged roles from `Demo/01_Org_Structure_SaoMai.xlsx` | Temporary Vitest script (removed) generating the workbook with `buildUserImportWorkbook`, then `parseUserImportFile` + `validateImportRows` | Passed |
| S-01 | Downloaded template header in the running app shows `Current role` | `system-tests/FR-03-01-bulk-user-import.spec.ts` assertion updated | Not Run (no stack started for this change) |

**Commands (from `frontend`):** `npx vitest run src/features/administration/user-management/import --testTimeout=30000` → 11/11 passed (the default 5 s timeout failed once on a cold ExcelJS load and passed on rerun); `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
