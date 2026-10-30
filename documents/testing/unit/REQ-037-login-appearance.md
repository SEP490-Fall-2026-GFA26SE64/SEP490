# REQ-037-F01: Original Login Appearance Restoration

**Date:** 2026-10-26. **Revision:** [approved L1 brief](../../features/Workspace%20administration/README.md#implementation-brief-req-037-f01-login-appearance-restoration).  
**Scope:** Login presentation only; current authentication/API/MFA/session policy and the separate member-activation page remain unchanged.

## Actual Checks

From `frontend`:

```powershell
npm.cmd test -- src\features\auth\LoginPage.test.tsx src\features\guest\GuestLandingPage.test.tsx --maxWorkers=2
npm.cmd run build
```

Final run at 18:13 +07:00: **12 tests passed across 2 files; exit 0**. TypeScript/Vite build: **Passed, exit 0**. The existing large-bundle warning remains.

Focused lint on `WorkspaceLoginPage.tsx`, login/landing tests and `REQ-037-login-appearance.spec.ts`: **exit 0, no reported findings**.

| Acceptance | Actual assertions |
| --- | --- |
| LOGIN-AC01 | Earlier illustrated frame, centered card, Enterprise Sign In heading and both existing WebP assets restored. Empty credentials; no demo role strip or old guest-signup shortcuts. |
| LOGIN-AC02 | Same sign-in/CSRF/TOTP/recovery request paths, method and payload; pending/error states stay in the original card. No auth_user/active_actor storage authority. |
| LOGIN-AC02 | Recovery transitions to re-enrollment; generated recovery codes remain one-time-visible and completion is gated on acknowledgement. Fresh-sign-in handling for administrator assurance change is preserved. |
| LOGIN-AC03 | Password concealed initially; Show/Hide accessibility labels describe the next action and retain entered value; EN/VI heading/control labels switch correctly. |
| LOGIN-AC04 | MemberActivationPage does not acquire the restored login frame. Existing landing links and guest-entry separation remain intact. |

The suite contains 7 login/restoration tests plus 5 landing regressions. Component fixtures are isolated test doubles, not claims of live authentication; real-API browser evidence is [recorded separately](../system/REQ-037-login-appearance.md).

## Retained Failure

After expanding tests, a build failed because Testing Library `getByRole` options incorrectly contained Playwright's `exact` option (6 TypeScript errors). Removed those unsupported options without weakening name assertions; reran both targeted suites and the full frontend typecheck/build successfully. Application authentication behavior was not changed to accommodate tests.

Backend/database tests are Not Applicable to this visual-only revision because no backend, schema, credential, dependency or session-policy code was changed. The isolated browser flow validates the real existing backend boundary.
