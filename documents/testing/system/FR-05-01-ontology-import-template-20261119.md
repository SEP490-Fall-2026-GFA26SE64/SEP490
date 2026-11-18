# FR-05.01 — Competency / micro-skill import template restyle (2026-11-19)

Scope: the downloadable Excel templates on the ontology page now follow the organization-structure template design (Instructions tab first, then the data tabs; orange required headers, light-orange optional headers, frozen header row, zebra rows, header notes, drop-downs and in-sheet validation). Sheet names, header names and the import parser are unchanged.

Environment: local Docker stack `adapt-learn-graph-kgtest`, web at `http://127.0.0.1:8088` (live Vite over this repo's `frontend/`), Chrome via `playwright.system.config.ts`. Actor: Domain Expert `expert@workspace.dev.invalid`.

| ID | Check | Command / procedure | Expected | Result |
| --- | --- | --- | --- | --- |
| T1 | Template builder (unit) | `npx vitest run src/features/manager/ontology` | Competency workbook = Instructions, Competencies, Competency_Skills; micro-skill workbook = Instructions, Micro_Skills, Competency_Skills, Prerequisites; examples round-trip through SheetJS `sheet_to_json`; validations present | Passed |
| T2 | Organization template unaffected (unit) | `npx vitest run src/features/guest` | Org-structure template tests pass after moving its palette to `shared/lib/excelTemplateStyle.ts` | Passed (the unrelated pre-existing `GuestLandingPage` "Enterprise Sign In" test fails with or without this change) |
| T3 | Typecheck | `npx tsc -p tsconfig.app.json --noEmit` | No errors | Passed |
| S1 | Competency template download and re-upload | `npx playwright test -c playwright.system.config.ts system-tests/FR-05-01-ontology-import-template.spec.ts` | File name, tab order, Instructions title, header fill `EA580C`; re-uploading the template previews `COMP-SYS-01`; no console errors or HTTP ≥ 400 | Passed |
| S2 | Micro-skill template download and re-upload | same spec | Tab order incl. Prerequisites; re-upload previews `MS-SKILL01` | Passed (2 passed, 1.0 m) |

Artifacts: downloaded workbooks under `frontend/test-results/` (not committed). The import is never confirmed, so no data is written.

## Manual checklist

1. Sign in as a Domain Expert at `http://127.0.0.1:8088`, open **Ontology** → **Competencies**, click **Import Excel** → **Download Template**.
2. Open the file in Excel: the first tab is **Instructions** (title, sheet table, rules, legend); the data tabs have orange required headers, light-orange optional headers, frozen row 1 and filters.
3. Type a code with a space or a duplicate code in **Competencies** → Excel rejects it; **Mode** and **Level** columns offer drop-downs.
4. Upload the untouched template → the preview lists the example rows. Close without importing.
5. Repeat on the **Micro-skills** tab (Prerequisites tab included).
