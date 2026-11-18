# UX: Unified Page Loading Transition Evidence

**Date:** 2026-11-19. **Scope:** cross-cutting frontend UX (no product REQ ID). Every page transition and page-level data load uses one shared loader (`PageLoader`): fullscreen before the workspace shell exists (boot splash, Suspense, login, workspace gate), inline inside the shell. Button/action spinners are out of scope. Local/dev slice only.
**Owners:** `frontend/src/shared/components/ui/PageLoader.tsx`, `frontend/src/shared/styles/pageLoader.css`, `frontend/index.html`, `frontend/src/features/subscription/WorkspaceBoundary.tsx`, `WorkspaceLoginPage.tsx`.

## Acceptance Criteria

| ID | Criterion |
| --- | --- |
| PL-01 | One loader component; no remaining page-level ad-hoc spinners/"Loading…" text. |
| PL-02 | Sign-in → workspace shows only the fullscreen branded loader: no blank frame, no "Workspace access" or "Authentication complete" screen. |
| PL-03 | Inside the workspace, page data loads inline while the shell (sidebar/header) stays visible. |
| PL-04 | Loader exposes `role="status"`; reduced motion stops decorative motion and slows the ring. |
| PL-05 | A slow server never looks frozen: after 8 s the loader explains the wait; the fullscreen variant offers **Reload page**. Loaders always clear once requests finish. |
| PL-06 | Pre-boot HTML splash uses the same markup as the React loader. |

## "Stuck on loading" Investigation (2026-11-19)

Real-browser traces on `http://127.0.0.1:8097` (dev fixtures employee/ld/expert) found **no loader that waits forever**: every loader cleared once its requests returned. Observed causes of long waits were environmental: a trivial `GET /api/v1/workspace-auth/current` took 0.7–4.0 s; `/employee/knowledge-profile` 7.5 s, `/journey` 8.1 s, `/organizations/{id}/job-positions` 5.4 s; the Vite web container used ~45 % CPU with a second stack running. Gate conditions in `WorkspaceBoundary` only wait on enabled queries, so a disabled query cannot pin the loader. Fix: PL-05 slow state (explanation + reload), verified below.

## Component / Static Checks

From `frontend`:

| Command | Result |
| --- | --- |
| `npx vitest run src/shared/components/ui/PageLoader.test.tsx` | Passed — 2 tests (PL-05 fullscreen hint + reload; inline hint without reload) |
| `npx vitest run src/features/subscription src/shared` | 143 passed, 4 failed — failures pre-existing and unrelated (`subscriptionApi.test.ts` ×2, `QuestionId.test.tsx` ×2; reproduced on clean HEAD) |
| `npx tsc -p tsconfig.app.json --noEmit` | No errors in changed files (pre-existing errors in unrelated files remain) |
| `npx oxlint src/shared/components/ui/PageLoader.tsx src/shared/components/ui/PageLoader.test.tsx` | Passed |

## Browser Checks (Playwright, system Chrome)

Command (from `frontend`): `$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8097'; npx playwright test -c playwright.system.config.ts UX-unified-page-loader --reporter=line --workers=1`
Spec: `frontend/system-tests/UX-unified-page-loader.spec.ts`. **Result: 5 passed (2.3 min).**

| ID | Test | Actual | Status |
| --- | --- | --- | --- |
| PL-06 | Pre-boot splash markup | `/login` HTML contains `data-page-loader="fullscreen"`, ring and brand | Passed |
| PL-02 | Employee sign-in, 1440×900, per-frame trace | Fullscreen loader observed; 0 blank / "Workspace access" / "Authentication complete" / legacy text frames; landed on employee overview; no console errors or failed responses (except permitted anonymous 401 probe) | Passed |
| PL-02/03 | L&D sign-in, 390×844, job-positions data held 2.5 s | Fullscreen → inline loader inside shell (user menu visible) → 0 loaders; no errors | Passed |
| PL-05 | Employee sign-in with `/subscription/access` held 11 s | "Still loading…" + **Reload page** shown, then entered workspace and loader cleared | Passed |
| PL-04 | Reduced motion | Halo `animation-name: none`; ring `2.4s` | Passed |

Screenshots inspected (untracked, `frontend/test-results/UX-unified-page-loader/`): `desktop-employee-transition.png`, `desktop-employee-landed.png`, `mobile-ld-transition.png`, `mobile-ld-inline-loader.png`, `mobile-ld-landed.png`, `desktop-slow-gate.png`.

## Manual Checklist

Prerequisites: dev stack at `http://127.0.0.1:8097`; dev fixtures from DEV-DEMO.md.

1. Hard-reload `/login`. Expect the branded fullscreen loader (ring, Adapt-Learn-Graph, progress bar) before the form; no blank white frame.
2. Sign in as `employee@workspace.dev.invalid`. Expect only the fullscreen loader ("Opening your workspace…") until the overview appears; no "Workspace access" or "Authentication complete" screen.
3. On the overview, expect the Competency profile region to show the inline loader card (shell stays visible) and then the graph.
4. Sign in as `ld@workspace.dev.invalid` on a phone-width window. Expect the inline loader in Job positions, then the directory.
5. Throttle the network (DevTools → Slow 3G) and sign in. After ~8 s expect "Still loading. The server is responding slower than usual…" and **Reload page**; the page still finishes on its own.
6. Switch the language to VI and repeat step 1. Expect "Đang tải…" and, when slow, "Tải lại trang".
7. Enable OS "reduce motion". Expect no pulsing halo/sliding bar and a slower ring.
