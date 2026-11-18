# FR-03.01 Bulk user import from Excel — unit/component evidence (2026-11-17)

**Scope:** System Administrator bulk creation of member invitations from an `.xlsx` file on User Accounts ([FR-03.01](../../features/Workspace%20administration/README.md#fr-03-01)). Frontend-only: template generation, parsing, validation and per-row calls to the existing invitation API. No backend change.

**Environment:** Windows 11, Node 22, Vitest, `exceljs@^4.4.0`, local workspace `main` plus this change set.

| ID | Acceptance | Test | Result |
| --- | --- | --- | --- |
| U-01 | Template tab order Guide → Users → Lists (hidden Options last); header row 3, frozen pane, drop-down validations bound to the hidden Options lists | `userImport.test.ts` › puts the Guide tab first… | Passed |
| U-02 | Downloaded error report re-imports; its "Import error" column is ignored | › round-trips an error report… | Passed |
| U-03 | Invalid workbook, no rows, missing required headers and more than 50 rows are rejected with specific messages | › rejects files that are not a workbook… | Passed |
| U-04 | English headers in any column order, hyperlink e-mail cells and blank rows | › reads English headers… | Passed |
| U-05 | Complete Employee row accepted in EN/VI; empty Level defaults to the entry level | › accepts a complete employee row… | Passed |
| U-06 | Required fields, e-mail format, unknown role and already-existing member/invitation e-mails reported per row | › reports required fields… | Passed |
| U-07 | Duplicate e-mail flagged from its second occurrence | › flags duplicate emails… | Passed |
| U-08 | Department → Job position → Target role → Level chain enforced (Target role/Level Employee-only) | › enforces the department → job position… | Passed |
| U-09 | L&D Manager row needs only a department; job position ignored | › lets an L&D manager row… | Passed |
| U-10 | Invitation payload identical to the Create User form (Employee target role encoding, L&D without job position) | › builds the same invitation payload… | Passed |
| U-11 | Import Excel is disabled together with Create User for an expired subscription | `UserManagementPage.test.tsx` › keeps deactivation but disables creation… | Passed |

**Commands (from `frontend`):** `npx tsc -p tsconfig.app.json --noEmit` (pass); `npm test -- src/features/administration/user-management` → **18/18 passed** (8 existing + 10 new); `npm run lint` (exit 0, no findings in the new `import/` files; existing warnings in `UserManagementPage.tsx` only moved lines); `npm run build` (pass; `exceljs` is lazy-loaded into its own chunk, ≈256 kB gzip, only when the template/upload is used).
