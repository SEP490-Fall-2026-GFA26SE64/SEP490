# Single-role identity and Platform Admin seed

Date: 2026-10-28. Approved identity refinement R1. Current source mappings: FR-03.01, FR-03.03, FR-07.01 and FR-07.10; legacy REQ-022/037/039 remain test traceability.

## Backend/API/database/architecture

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=WorkspaceAuthenticationServiceTest,SubscriptionAccessPolicyTest,MemberProfileUpdateTest,SubscriptionCatalogServiceTest,SubscriptionPlanApiIntegrationTest,PaymentOrderPostgresIntegrationTest,TransactionalEmailTest,HexagonalArchitectureTest' test
```

Final result: **59 passed, zero failures/errors/skips, exit 0**. This combined count includes PostgreSQL integration and ArchUnit, not 59 unit-only checks.

- Seeded Platform Admin has no verified-email timestamp, organization membership or TOTP; password-only sign-in produces FULL authority with `mfaVerified=false`.
- All three invited roles use password-only authentication; Organization Administrator still requires MFA. Ambiguous roles and invalid/disabled/revoked identities are denied.
- Platform APIs accept the actual password-authenticated platform role but reject organization roles and forged authority; CSRF remains required for updates.
- Seed is idempotent, stores the existing PBKDF2 hash format and refuses to promote a colliding organization account or silently change credentials.
- V12 uniqueness, required membership role and platform/organization mutual exclusion reject conflicting direct SQL mutations.
- Role replacement updates Employee seat usage, initializes missing learner state and preserves learning history when switching away.
- Shared email MIME includes plaintext, HTML, PNG and `Content-ID: <alg-brand-logo>`; dynamic escaping remains tested.

See [integration details](../integration/REQ-037-single-role-identity.md).

## Frontend

**Later A1 layout-only run, 2026-10-28:** login and activation now reuse the same illustrated frame. Focused login/activation component tests passed 10/10; build and scoped lint passed. [A1 browser evidence and manual checklist](../system/REQ-037-activation-layout.md) records new results separately from the identity-policy run below.

From `frontend`:

```powershell
npm.cmd test -- src\features\subscription src\features\administration\user-management\UserManagementPage.test.tsx src\shared\auth src\features\auth\LoginPage.test.tsx src\features\guest\GuestRegisterPage.test.tsx
npm.cmd run build
npm.cmd run lint
```

Final result: **40 tests passed across eight files**, build passed, lint exit 0. Existing unrelated lint warnings and bundle-size warnings remain.

Checks include each trusted role's destination, rejection of missing/multiple roles without an Employee fallback, radio-only role selection, real identity/logout context, activation layout without the organization wizard, inline password validation/focus and clearing the activation proof/passwords after success.

## Recorded corrections

Initial regression tests still expected mixed roles and Platform MFA; they were updated to the approved policy while retaining negative authorization/CSRF/history assertions. Test fixture membership+role creation now uses one transaction, matching the new deferred required-role constraint. No constraint was weakened to pass tests.

A newly introduced Fast Refresh context-export warning was resolved by moving the shared context into its own non-component module. Historical runs remain in earlier evidence files.
