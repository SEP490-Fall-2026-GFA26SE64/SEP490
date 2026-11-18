# FR-03.01 Bulk user import from Excel — system/browser evidence (2026-11-17)

**Stack:** running Compose project `alg-fr0407` (web `http://127.0.0.1:28088` Vite dev server mounting `frontend/`, API `28080`). `exceljs` was installed into the web container's `node_modules` volume and the web container restarted. SMTP is configured, so real invitation e-mails were sent to reserved `@example.com` addresses.

**Command:** `cd frontend; $env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:28088'; npx playwright test --config=playwright.system.config.ts FR-03-01-bulk-user-import`

**Actor:** `admin@technova.com` (Organization Administrator, TechNova Cognitive Labs).

## Results — 2/2 Passed (Chrome)

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| S-01 | Desktop 1440×900: **Import Excel** opens the dialog; template downloads with visible tabs Guide, Users, Lists (Guide first) and a very-hidden Options tab | As expected | Passed |
| S-02 | A `.txt` file is rejected with a text alert | "Only .xlsx files are supported" | Passed |
| S-03 | Upload of 5 rows (2 valid, invalid e-mail, existing member, L&D Manager without department) → preview shows 5 rows / 2 valid / 3 with errors and per-row messages; "errors only" filter shows 3 rows | As expected | Passed |
| S-04 | Error report downloads with only the 3 invalid rows and an "Import error" column | As expected | Passed |
| S-05 | **Import 2 valid user(s)** → "2 invitation(s) sent. 3 row(s) not imported."; after reload both e-mails are found in the directory as pending; no HTTP ≥ 400 after sign-in | As expected | Passed |
| S-06 | Mobile 390×844: upload step stacks, preview uses stacked cards, Import disabled with 0 valid rows, no horizontal page overflow | As expected | Passed |

**Artifacts (inspected):** `frontend/test-results/FR-03-01-import/` — `upload-desktop.png`, `preview-desktop.png`, `done-desktop.png`, `directory-after-import.png`, `upload-mobile.png`, `preview-mobile.png`, `user-import-template.xlsx`, `user-import-errors.xlsx`. The template was also opened in Microsoft Excel and exported to PDF to confirm the Guide/Users layout and print fit.

**Limits:** browser run used English; Vietnamese headers/labels are covered by unit tests U-01/U-05. Invitations created by the run remain as pending invitations on this development stack. Not production acceptance.

## Manual test checklist

Prerequisite: stack running, signed in as an Organization Administrator, open **User Accounts**.

1. Click **Import Excel** → **Download template (.xlsx)**. Open it: the first tab **Guide** explains steps, columns, rules by role, examples and notes; **Users** has orange required headers with drop-downs; **Lists** shows Department → Job position → Target role → Levels.
2. Fill 2–3 users on **Users** (one with an error, e.g. a bad e-mail). Save as `.xlsx`.
3. Drag the file into the dialog or click **Choose file** → the preview shows each row as Valid/Error with reasons.
4. Click **Download error report** → only error rows, with an "Import error" column; fix and re-upload.
5. Click **Import N valid user(s)** → progress, then a summary; close with **Done** → the new users appear as pending invitations and receive activation e-mails.
6. Switch language to **VI** and download again → tabs and headers are in Vietnamese (Hướng dẫn, Người dùng, Danh mục).
7. With an expired subscription or full seats, **Import Excel** is disabled like **Create User**.
