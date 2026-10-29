# REQ-037-F01: Login Appearance Browser Evidence

**Date:** 2026-10-26. **Contract:** [approved L1](../../features/Workspace%20administration/README.md#implementation-brief-req-037-f01-login-appearance-restoration).  
**Verification URL:** `http://127.0.0.1:8092/login`, separate subscription-test Compose project.  
**User-facing URL after authorized frontend reload:** `http://127.0.0.1:8088/login`.

## Environment and Execution

Existing Docker images, PostgreSQL/session persistence and Chrome were reused. Started only the existing isolated project with `up -d --no-build`; no dependency installation, new schema or API image change. The test override has blank merchant credentials and isolated fixture identity support.

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npx.cmd playwright test --config=playwright.system.config.ts REQ-037-login-appearance --output=test-results\login-appearance-l1
```

**Result: exit 0, 2 passed in 30.0 seconds.**

### LOGIN-AC01 / AC03: Original Presentation and Interaction

- Desktop 1440x1000: both original illustrations load and are decorative; centered card width 580px and radius 42px match the retained visual layout; CTA uses the primary token.
- Mobile 390x844: card radius 28px; illustrations hide as before, no horizontal overflow. EN/VI and reduced-motion mode verified.
- Landscape 844x390: no horizontal overflow and submit remains reachable.
- Keyboard Tab moves from email to password to visibility control. Enter toggles password visibility; its accessible name describes the next action.
- No demo credentials, fake role selector or reintroduced guest-signup shortcut.

### LOGIN-AC02 / AC04: Real Authentication Preserved

- Synthetic MFA-enrolled Platform Administrator signs in against actual isolated APIs, not browser interception.
- Wrong password produces a real 401 and retains email.
- Password-only stage cannot read platform plan APIs (401).
- Invalid recovery proof returns 400, displayed inside the restored card without overflow.
- Valid authenticator proof completes authentication. Page reload retains the backend session and platform read succeeds (200).
- Session cookie remains HttpOnly/SameSite=Lax with `/api/v1` path. No auth_user/active_actor browser-storage authority appears.
- Real sign-out invalidates the session; current-user returns 401 and reloaded password field is empty.
- No page errors, unexpected failed network requests or 5xx responses were observed. Expected 401/400 responses are explicitly asserted.

Successful recovery/re-enrollment and recovery-code acknowledgement rendering/request contracts were additionally covered by [component tests](../unit/REQ-037-login-appearance.md); this browser run does not claim a new full live recovery certification.

## Screenshots Inspected

Under `frontend/test-results/login-appearance-l1/`:

- `REQ-037-login-appearance-r-16d86-bile-without-demo-authority-system-chrome/enterprise-login-desktop.png`
- `REQ-037-login-appearance-r-16d86-bile-without-demo-authority-system-chrome/enterprise-login-mobile-vi.png`
- `REQ-037-login-appearance-o-44bb8-and-session-reload-behavior-system-chrome/enterprise-login-recovery-error-mobile.png`

Inspected the restored two-illustration/card hierarchy, mobile wrapping and recovery error panel. Trace/video/automatic screenshots are disabled; explicit screenshots contain no entered passwords, active MFA secrets or recovery codes.

## Development Frontend Reload and Cleanup

The source-mounted development Vite server initially served the old cached login module. The user separately approved `restart-web-only`. Restarted **only** `adapt-learn-graph-dev-web-1`; `/login` returned HTTP 200 and served the restored `.razor-login-page` module afterward. The API health remained `UP`; API/database/ngrok were not restarted.

Stopped the isolated subscription-test project after verification with volumes preserved. Confirmed no services remain running in that isolated project. No live authentication attempt, payOS call, payment, email, retained-data migration/reset, commit or deployment was performed.

## Manual Checklist

1. Open `http://127.0.0.1:8088/login` and refresh. Expect original brand header, illustrations, centered rounded card, **Enterprise Sign In**, orange submit and footer.
2. Email/password start empty. Toggle Show/Hide; confirm the accessible action label and the password's concealed default.
3. Switch EN/VI and resize to mobile. Expect no horizontal overflow and no side illustrations on narrow screens.
4. For repeatable authentication verification, start the isolated stack and run the exact Playwright command above. It provisions its own synthetic administrator, checks invalid credentials, MFA/recovery error, reload and sign-out. Do not use live accounts just to repeat the visual check.
5. For authorized manual sign-in, use an existing account; administrators still require MFA. Role/session authority must remain backend-owned. No demo identity shortcut is available.

The existing member activation layout is unchanged. The separate payOS `PROVIDER_UNAVAILABLE` issue was not modified by L1.

```text
environment: Docker / Node / existing Chrome available
startup: PASS — isolated API UP; restored Vite source served
component: PASS — exit_code 0; 12 passed
build: PASS — exit_code 0; existing bundle-size warning
e2e: PASS — exit_code 0; 2 passed, no failures
overall: PASS — approved visual restoration only; no backend or payment-policy change
```
