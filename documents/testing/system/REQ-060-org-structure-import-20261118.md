# REQ-060/061: Organization structure import â€” browser evidence and manual checks

Date: 2026-11-18. FR-01.01 / FR-07.03 local scope.

## Environment and command

- Isolated Compose project `alg-orgimport` from `compose.dev.yml` with independent volumes; another running project (`adapt-learn-graph-kgtest`, port 8088) was not touched.
- Actual URL: `http://127.0.0.1:8097/guest/register`; API 18097, PostgreSQL 15497, Neo4j HTTP/Bolt 7497/7697.
- Session-only environment: `MINIO_IMAGE` set to the locally built MinIO image (the pinned pull was denied), `PAYOS_ENABLED=false` so the development payment bypass provisions locally. No live payments or emails.
- The build re-tagged the shared `adapt-learn-graph-backend:dev` image; already running containers of other projects keep their image.

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8097'
npm.cmd run test:system:f02 -- REQ-060-org-structure-import.spec.ts --output=test-results\org-structure-import
```

The spec refuses any other base URL and reads only the `alg-orgimport-*` database containers.

## Result

**3 passed, 0 failed (2.3 min).**

| Journey | Observable assertions |
| --- | --- |
| 1440px | Apply disabled before a file; template download is an xlsx (`PK`) named `organization-structure-template.xlsx`; CSV upload with quoted commas; 11 tree items; search narrows to 3; tree selection shows code/scope in detail; graph canvas painted, Department in legend; no dialog overflow; Apply shows counts; registration POST carries 4 rows; PostgreSQL stores 11 nodes / 9 relationships; dev purchase â†’ READY workspace; Neo4j holds exactly the 11 expected nodes and 9 expected relationships for the new organization |
| 390px | Same flow using the mobile Structure/Graph switch |
| 375px invalid | API 403 without CSRF and 400 `field=organizationStructure`; three row errors (duplicate rank, job position owned by another department, non-numeric rank) in the error table; Apply disabled; missing-columns message; Escape closes without applying |

Observers asserted no uncaught page errors, unexpected console errors, 5xx responses or failed requests (expected anonymous 401s, the deliberate 400 and the dev-server favicon 404 excluded).

Screenshots (inspected): `frontend/test-results/org-structure-import/*/org-structure-dialog-1440.png`, `org-structure-dialog-390.png`, `org-structure-errors-375.png`, `workspace-ready-{1440,390}.png`. After the first run, mobile count cards were replaced by compact badges to give the graph room; the rerun passed.

## Manual checklist

Prerequisites: an isolated stack as above; a spreadsheet editor.

1. Open `http://127.0.0.1:8097/guest/register` as a Guest (signed out).
2. In **Organization structure**, choose **Import structure**, then **Download template**; open it and confirm the `Organization structure` sheet (10 headers, 3 example rows) and the `Instructions` sheet.
3. Edit the template with two departments and upload it as `.xlsx`. Expected: counts, collapsible tree, graph with Department pentagon nodes, details for a clicked node.
4. Save the same data as CSV with `;` separators (Vietnamese Excel locale) and upload. Expected: same result.
5. Change one level rank to duplicate another level of the same role. Expected: error table names the row and `Level rank`; Apply disabled.
6. Press **Cancel**. Expected: the previously applied structure (if any) remains.
7. Apply a valid file, finish registration and the development purchase. Expected: workspace becomes READY; the admin knowledge graph lists the imported departments, job positions, target roles and levels only for this organization.
8. Repeat step 3 at 390px width and in Vietnamese (VI). Expected: Structure/Graph switch, no horizontal scrolling, translated labels.

Not verified: production payOS, real SMTP, files produced by every spreadsheet application.

The older `REQ-060-061-multi-org-workspace.spec.ts` registration step was updated from the removed picker to this import (it lists/compiles), but it targets the separate `alg-multi-org-smoke` stack on port 8096 and was **Not run** in this task.

The `alg-orgimport` stack was stopped after verification with `docker compose -p alg-orgimport -f compose.dev.yml stop`; its volumes were retained. Restart it with the same project name and the port/env variables above.

## Revision 2 ï¿½ tabbed workbook with Excel validation (2026-11-18)

The `alg-orgimport` stack was rebuilt from the current tree (same ports and environment as above). Command unchanged; output `test-results\org-structure-import-tabs`.

**3 passed, 0 failed (2.1 min)**, on the final run:

| Journey | Observable assertions |
| --- | --- |
| 1440px, 390px | The downloaded template (`PK`, `organization-structure-template.xlsx`) is uploaded unchanged; 12 tree items; search narrows to 3; detail shows code and scope; graph painted; registration POST carries 2/2/3/5 rows per tab; PostgreSQL 12 nodes / 10 relationships; READY workspace; Neo4j holds exactly the 12 nodes and 10 relationships expected for the template |
| 375px invalid | API 403 without CSRF, 400 for an empty workbook; a downloaded template edited to contain an unknown department, a duplicate rank and a non-numeric rank yields three errors listed by tab/row; Apply disabled; a `.csv` upload is refused with the `.xlsx` message; Escape closes without applying |

Run notes: an earlier 390px run returned 429 after more than ten sign-ups in an hour from one IP (the designed registration limit). Only `platform.registration_rate_limit` in the isolated stack's database was cleared before the final run. The first 375px screenshot showed the Problem column clipped; on small screens, row and column now fold into the Sheet cell. Screenshots inspected: `org-structure-dialog-{1440,390}.png`, `org-structure-errors-375.png`, `workspace-ready-{1440,390}.png`.

Manual checklist additions (Excel required):

1. Download the template; confirm the Instructions, Departments, Job positions, Target roles and Levels tabs, orange input headers and grey automatic name columns.
2. In Job positions, open the Department code dropdown: only codes from Departments are listed. Typing an unknown code is refused.
3. Type an existing department code in different case in Departments: refused as a duplicate.
4. In Levels, enter rank 0, 1.5 or a rank already used by that target role: refused. The automatic Target role name fills in.
5. Try to type into a grey automatic name cell: blocked by sheet protection.
6. Upload the completed workbook: the review dialog shows the structure.

## Revision 3 — compact dialog, merged levels, organization root (2026-11-18/19)

Display-only changes: compact initial dialog without the instruction table; graph root "My organization" linked to departments; same-name levels merged into one graph node whose details list role and rank; level counts show distinct level names. The stored structure and Neo4j writes are unchanged.

`REQ-060-org-structure-import.spec.ts` on `alg-orgimport` (8097), output `test-results\org-structure-import-r3`: the 390px journey and the 375px invalid-workbook journey passed in the first run. In that run the 1440px journey passed every structure assertion (compact dialog =600px wide with no table, Organization legend, **10 nodes** = root + 2 departments + 2 job positions + 3 roles + 2 merged levels, summary `Level: 2`), then timed out on the plans page, which stayed on "Loading…". During that run another session was editing the live-served frontend shell (`PageLoader`, `App.tsx`). An immediate rerun of the 1440px journey **passed**, so all three journeys have passed. Screenshots inspected: `org-structure-compact-1440.png` and the dialog showing the root, merged Junior/Senior and Level 2.

### Revision 3b — full dialog with empty structure (2026-11-19)

Per user follow-up, the compact initial dialog was replaced: the dialog now opens at full size, before any upload, with zero counts, the empty-list message "No structure yet. Upload your workbook to see it here." and a graph showing only "My organization". The shared graph counter now uses the singular "1 node". Same command, output `test-results\org-structure-import-r4`: **3 passed, 0 failed (3.2 min)**. The new assertions cover the empty message, `Department: 0` and a single-node graph at 1440px and 390px. Screenshots `org-structure-empty-{1440,390}.png` were inspected.

### Revision 4 — staged roles and "Role" wording (2026-11-19)

Imported Target roles are now written with `status=STAGED`; departments, job positions and levels stay `ACTIVE`. In the import template, dialog and server messages, "Target role(s)" became "Role(s)": tab `Roles`; columns `Role code/name/scope`; Levels column `Role code`. Shared catalog screens keep "Target role". Backend isolated run (importer, ArchUnit, Neo4j writer incl. new `STAGED` assertion, registration API): **17 passed, 0 failed**. Vitest guest + knowledge-graph: **44 passed, 1 failed**; the failure is `GuestLandingPage` "Enterprise Sign In", caused by another session's concurrent login-shell edits. Playwright on `alg-orgimport` (8097): **3 passed**. After rebuilding the 8097 API container, the 1440px journey passed again, and Neo4j for the new organization returned TargetRole `STAGED`×3 and Department/JobPosition/Level `ACTIVE`. The scratch workbooks were regenerated with the renamed tab.
