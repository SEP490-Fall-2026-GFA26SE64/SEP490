# REQ-037: Login Auto-Redirect and Recovery-Code UI Evidence

**Date:** 2026-11-19. **Scope:** after valid authentication the workspace login page enters the role workspace without an extra "Continue to workspace" click; recovery-code entry and one-time recovery-code display polished without changing the card layout.
**Owner:** `frontend/src/features/subscription/WorkspaceLoginPage.tsx`.

## Acceptance Criteria

| ID | Criterion |
| --- | --- |
| AR-01 | Valid password-only sign-in navigates directly to the role workspace. |
| AR-02 | MFA verify (authenticator or recovery code) navigates directly after completion. |
| AR-03 | Freshly issued recovery codes block navigation until "I saved the recovery codes"; then navigation is automatic. |
| AR-04 | Accounts without exactly one valid role or a workspace slug do not navigate and show the existing error. |
| AR-05 | `next=` handling stays restricted to the member's own workspace. |
| AR-06 | Already-signed-in user opening `/login` is sent to the workspace. |
| AR-07 | Recovery-code entry shows hint, monospace input and icon toggle; code list shows numbered grid, copy-all, warning notice; no layout change, no horizontal overflow on mobile. |

## Component Tests

From `frontend`: `npx vitest run src/features/auth/LoginPage.test.tsx`
**Result: Passed — 14 passed** (AR-01..AR-05, AR-07 list rendering). `tsc -p tsconfig.app.json` reports no errors in changed files (pre-existing errors in unrelated files remain).

## Browser Checks (Playwright, system Chrome)

Environment: source-mounted dev stack `adapt-learn-graph-kgtest` at `http://127.0.0.1:8088/login`, dev fixture `employee@workspace.dev.invalid` (DEV-DEMO.md).

| ID | Procedure | Actual | Status |
| --- | --- | --- | --- |
| AR-01 | Fill email/password, click Sign in once (1280x800 and 390x844) | Landed on `/workspace/workspace-development/employee/overview`; only the expected pre-login 401 on `/current` | Passed |
| AR-06 | Revisit `/login` while signed in | Redirected to employee overview | Passed |
| Invalid credentials | Wrong password for the Employee fixture | Stayed on `/login`; error "Email or password is incorrect…" shown in the card | Passed |
| AR-02/03/07 | Recovery-code entry → re-enrollment → code list → acknowledge, with **browser-intercepted** auth API (no MFA admin fixture in this dev stack) at 1280 and 390 widths | Hint/monospace/icon rendered; 10 numbered codes in grid; no horizontal overflow; navigation to `/workspace/acme/admin/subscription` only after acknowledgement; 0 console errors | Passed (visual/flow only; not a live MFA certification) |

Screenshots inspected (untracked, `scratch/`): `recovery-entry-390.png`, `recovery-codes-1280.png`, `login-auto-1280.png`.

## System Spec Migration

29 files under `frontend/system-tests` no longer click/wait for "Continue to workspace"; they use `waitForWorkspaceEntry` from `subscriptionHelpers.ts`. `npx playwright test --config=playwright.system.config.ts --list` parsed 73 tests in 27 changed files (Passed). `REQ-013-learning-content.spec.ts` cannot be listed without the local `local/dev-accounts/private.env` (Blocked, pre-existing). The migrated system suites were **Not Run** (require their isolated Compose stacks). Pre-existing note: `REQ-037-single-role-activation` and `REQ-037-dev-accounts` assert `/platform-admin/subscriptions`, whereas `ROLE_HOME` targets `/platform-admin/organizations`.

## Autofill Tint Fix (2026-11-19)

Chrome painted autofilled `.razor-input` fields light blue inside the white wrapper. `LoginPage.css` now masks `:-webkit-autofill` / `:autofill` with an inset `hsl(var(--card))` shadow and `hsl(var(--foreground))` text fill (all razor inputs: login, activation, MFA codes).

| Check | Actual | Status |
| --- | --- | --- |
| Chrome parses and loads both autofill rules on `http://127.0.0.1:8088/login` (`document.styleSheets` inspection) | Both selectors are present with the token values | Passed |
| Non-autofilled input unchanged | Computed `box-shadow: none` | Passed |
| Real browser autofill appearance | Chrome's saved-credential autofill cannot be triggered by automation | Not Run — manual check below |

Manual: in Chrome with a saved credential, open `/login`, pick the saved account. Expect the email/password fields to keep the white card background, with no blue rectangle inside the rounded border.

## Manual Checklist

1. Open `http://127.0.0.1:8088/login`, sign in as `employee@workspace.dev.invalid` with the development password. Expect immediate arrival at the employee overview without another click.
2. Open `/login` again. Expect redirect to the workspace.
3. Sign in with a wrong password. Expect the error inside the card and no navigation.
4. For an administrator with MFA: use **Use recovery code**; expect hint text and monospace input. After re-enrollment, expect the warning notice, numbered code grid and **Copy all**; navigation happens only after **I saved the recovery codes**.
