# Activation matches workspace sign-in: A1 evidence

Date: 2026-10-28. Scope: approved presentation-only A1, FR-03.01/FR-07.01 (legacy REQ-022/037).

## Delivered boundary

`WorkspaceAuthLayout` now supplies the same brand header, language control, decorative illustrations, central Card/PageHeader and footer to workspace login and member activation. It reuses the existing login stylesheet/assets; no global theme or login behavior redesign.

`/activate` remains canonical and `/active` renders the same activation component without redirecting away an incoming token fragment. Password validation, token consumption/clearing, API payload and role-specific sign-in behavior are unchanged. No backend/schema/dependency changes.

## Actual checks

From `frontend`:

```powershell
npm.cmd test -- src\features\auth\LoginPage.test.tsx src\features\subscription\MemberActivationPage.test.tsx
npm.cmd run build
.\node_modules\.bin\oxlint.cmd src\shared\layouts\WorkspaceAuthLayout.tsx src\features\subscription\WorkspaceLoginPage.tsx src\features\subscription\MemberActivationPage.test.tsx src\features\auth\LoginPage.test.tsx system-tests\REQ-037-activation-layout.spec.ts system-tests\REQ-037-single-role-activation.spec.ts
```

**Passed:** 10 component tests, production build and scoped lint; all exit 0. Existing build bundle-size warnings are not claimed resolved. Backend unit/schema suites are Not Applicable to this presentation-only change; real-API behavior is exercised below.

Existing isolated identity stack: `http://127.0.0.1:8093`, API `:18085`, Mailpit `:8030`. API health UP and frontend HTTP 200 verified. No backend rebuild or database reset.

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8093'
$env:REGISTRATION_TEST_INBOX_URL='http://127.0.0.1:8030'
npm.cmd run test:system:f02 -- REQ-037-activation-layout REQ-037-single-role-activation --output=test-results\activation-layout-a1
```

**Passed: six scenarios, zero failures/skips, exit 0, 3.0 minutes.**

| Criterion | Observed verification |
| --- | --- |
| AC1 | At 1440px and 390px, both activation routes match login card width/horizontal position within 1px, input border radius and footer text; exactly one card, no organization stepper or horizontal overflow. Illustrations are visible on desktop and hidden at the existing mobile breakpoint. |
| AC2 | Both routes render correctly. The real Expert invitation is opened through `/active`, preserves the exact email token fragment and activates successfully. |
| AC3 | Component tests preserve inline invalid-field errors, focused summary, no early request, exact token/password payload and secret clearing. Real API tests cover missing token, invalid input and consumed-token replay. |
| AC4 | Existing platform password-only login and all three invitee role flows pass, including persistence/reload, correct role landing and unauthorized access denial. |
| AC5 | Desktop/mobile and VI captures inspected; page errors and failed requests asserted empty. Existing captured-email scenario also passes unchanged. |

Artifacts: `frontend/test-results/activation-layout-a1`. Layout captures include `active-1440.png`, `active-390.png`, `activate-1440.png`, `activate-390.png` and `activation-mobile-vi.png`. Actual activation captures mask passwords.

## Development verification

Mounted dev source contained the new shared frame, but Vite initially served a cached old transform. Restarted only `adapt-learn-graph-dev-web-1`; no API/database restart or mutation. Subsequent read-only headless checks passed on both `http://127.0.0.1:8088/activate` and `/active`: correct heading, one shared login card and disabled submission without a proof.

## Manual checklist

1. Open `http://localhost:8088/login`, then `/activate` or `/active`; compare header, illustrations, centered card, rounded controls and footer.
2. With no token, verify the activation button is disabled and the page explains that an emailed link is required.
3. Use a synthetic invitation in the isolated environment. Test invalid/mismatched password, then a valid activation; confirm success links to login and the correct assigned-role workspace remains accessible after sign-in/reload.
4. Repeat at 390px and in VI. The card remains within the viewport, illustrations hide as on login, and errors/focus remain usable.

No live email/payment operation, seed, migration or commit was performed for A1.

Verification services were stopped afterward with their volumes retained. All four dev services remained running and API health remained UP.
