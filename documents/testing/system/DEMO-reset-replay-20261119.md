# DEMO: `/reset` Page and Demo Replay (System Evidence)

**Date:** 2026-11-19. **Scope:** demo tooling (no product REQ ID). The public `/reset` page runs the demo reset once on load and shows the removed counts. The scripted demo in [Demo/Demo.md](../../../Demo/Demo.md) can then be replayed with the same workspace address and admin email.
**Owners:** `frontend/src/features/demo-reset/DemoResetPage.tsx`, `demoResetApi.ts`, route `/reset` in `frontend/src/app/App.tsx`; demo files in `Demo/`; dev-server Buffer injection in `frontend/vite.config.ts`.

## Environment

Disposable Compose project `alg-demo` (`compose.dev.yml`; web 8099, API 18099, Postgres 15499) with `PAYOS_ENABLED=false` (development payment bypass) and real SMTP. URL: `http://127.0.0.1:8099`.

## Fix Found During Verification

In the Vite dev server, uploading any `.xlsx` failed with "This file cannot be read" (`nodebuffer is not supported by this platform`). ExcelJS reads `xl/theme/theme1.xml` through JSZip as `nodebuffer`, which needs a global `Buffer`. Only the production build injected it. `vite.config.ts` now applies the same `Buffer` inject to `optimizeDeps`, after which file 01 and file 02 import in the browser.

## Browser Checks (Playwright, system Chrome)

Command (from `frontend`): `$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8099'; npx playwright test --config=playwright.system.config.ts DEMO-reset-replay --reporter=line`
Spec: `frontend/system-tests/DEMO-reset-replay.spec.ts` (refuses any base URL other than 8099). **Result: 2 passed (4.4 min).**

| Test | Actual | Status |
| --- | --- | --- |
| Reset → onboarding with `Demo/01_Org_Structure_SaoMai.xlsx` (28 tree items, Department: 4) → Starter + dev bypass → Enter workspace → import `Demo/02_Users_SaoMai.xlsx` (11 valid, "11 invitation(s) sent. 0 row(s) not imported.") → `/reset` → onboard again with the same slug/email → `/reset`, 1440×1000 | DB: 1 account + 11 `workspace_activation` rows before reset; reset returned organizations 1, accounts 1, registrations 1, related rows 61, graph nodes 28, warnings `[]`; organization, invitations and `demo.inbox+%` accounts gone afterwards; second onboarding succeeded; no console errors or failed requests | Passed |
| Repeated reset at 390×844 | All counts 0, "1 seed organization kept", **Start onboarding** → `/register`, no horizontal overflow | Passed |

Screenshots: `frontend/test-results/**/reset-done-1440.png`, `reset-done-390.png` (local run artifacts, not committed). Invitations are sent sequentially over SMTP; the 11-row import took about 2–3 minutes.

Not run: Expert-side import of `03_Competencies_JavaBackend.xlsx` / `04_MicroSkills_JavaBackend.xlsx`, graph edits and role configuration in the browser. These need activated L&D/Expert accounts (real inboxes). The two files were generated from and parsed by the application's own template builders/parsers in Vitest.

## Manual Checklist

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `http://127.0.0.1:8088/reset` (no sign-in) | Loader, then "Demo data has been reset." with six counts and "1 seed organization kept" |
| 2 | Click **Reset again** | Counts return to 0 |
| 3 | Click **Start onboarding** | `/register` wizard opens at step 1 |
| 4 | Follow [Demo/Demo.md](../../../Demo/Demo.md) sections 1–2 | Workspace `saomai` created; 11 invitations sent |
| 5 | Open `/reset` again, then repeat step 4 with the same values | Reset removes the Sao Mai data; onboarding with slug `saomai` and the same admin email succeeds |
| 6 | Sign in as `admin@technova.com` / `Password123!` after reset | TechNova seed data is unchanged |
