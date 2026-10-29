# REQ-037 — five local development roles

Date: 2026-10-29. URL http://127.0.0.1:28188/login; API28180. Normal application JAR, real sessions/password hashing/memberships. Dedicated dev database; no test HTTP fixture endpoints in the running application. [Tooling and restart guide](../../../tools/dev-accounts/README.md).

## Actual browser verification

Playwright `frontend/system-tests/REQ-037-dev-accounts.spec.ts`, Chromium, one worker, real APIs without HTTP mocks:

| Role | Observed result |
|---|---|
| Platform Administrator | Login → Continue → `/platform-admin/subscriptions`; actual plan configuration and Sign out visible. Passed. |
| Organization Administrator | Login → Set up authenticator; Continue unavailable before MFA. Passed. |
| L&D Manager | Login → Continue → `/ld-manager/occupations`; account menu visible. Passed. |
| Expert | Login → Continue → `/expert/target-roles`; account menu visible. Passed. |
| Employee | Login → Continue → `/employee/overview`; account menu visible. Passed. |

First browser run:4 passed/1 failed because the test expected the shared User actions menu on the Platform layout, which instead has Sign out. Corrected the test to the existing layout; Platform passed its focused rerun. After restarting the dedicated API and repeating API verification, the final full browser run passed **5/5 in21.1s**, including fully loaded Platform plan/workspace controls. No UI change or auth weakening. This does not certify downstream feature workflows.

[Persistence/API checks](../integration/REQ-037-dev-accounts.md) also verify logout and role denial. [Guard/packaging checks](../unit/REQ-037-dev-accounts.md).

Visual inspection: [loaded Platform workspace](artifacts/REQ-037-dev-accounts/platform-login.png) shows the real Starter/Growth/Enterprise plans and the seeded organization controls. No passwords are present in the artifact.

## Manual checklist

Prerequisites: dedicated Compose running, frontend dev server on28188, private credentials from ignored `local/dev-accounts/ACCOUNTS.md`. One organization with four member roles; Platform is separate.

1. Open `/login` in a fresh browser context. Enter one sheet account and its password. Expected: the corresponding destination above; no demo role picker or second Module login.
2. For org.admin, select Set up authenticator, scan/add the displayed secret in an authenticator, enter its actual code and confirm. Save recovery codes privately. Expected: only after enrollment does Continue enter `/admin/subscription`. Enrollment/confirmation is deliberately left for the user and is **not claimed as executed** by this seed operation.
3. In each workspace verify identity; log out and revisit the protected route. Expected: login required. Do not reuse another account's browser cookies when comparing roles.
4. Platform can see the dev organization/plan controls. Company accounts cannot enter platform routes. Company admin can manage members/subscription only for its organization after MFA.
5. Restart dedicated services without removing volumes and sign in again. Expected: credentials persist. Repeated seed is not a password reset or subscription renewal.

## Boundaries

Credentials and encryption keys are private, outside Git. Email verification and subscription activation are synthetic development fixtures; no real email/payment. New Neo4j graph is empty: legacy modules/skills/question banks are not transferred by account seeding. Employee occupation reference is an activation fixture, not an ontology import. Organization Admin MFA still needs first-time user enrollment. No source schema or production auth policy changed; old28088 runtime/database remain separate. No commit or deployment to the old environment.
