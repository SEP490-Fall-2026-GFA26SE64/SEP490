# Platform seed, single-role activation and branding: browser evidence

Date: 2026-10-28. Scope: approved identity R1, FR-03.01/03.03/07.01/07.10 (legacy REQ-022/037/039).

## Environment and command

Fresh isolated `adapt-learn-graph-identity-test` project, preserving older dev/registration/subscription volumes. Compose inputs:

```powershell
docker compose -f compose.dev.yml -f compose.subscription-test.yml -f compose.identity-test.yml build api migrate web
docker compose -f compose.dev.yml -f compose.subscription-test.yml -f compose.identity-test.yml up -d --no-build
```

Real API/PostgreSQL/Neo4j, synthetic identities, signed test-only provider and Mailpit. Frontend `http://127.0.0.1:8093`, API `:18085`, inbox `http://127.0.0.1:8030`. Readiness: frontend HTTP 200, API UP.

From `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8093'
$env:REGISTRATION_TEST_INBOX_URL='http://127.0.0.1:8030'
npm.cmd run test:system:f02 -- REQ-037-single-role-activation REQ-022-admin-pages --output=test-results\identity-r1-final
```

**Final result: 6 passed, zero failures/skips, exit 0, 3.2 minutes.** The earlier five-scenario identity-only run also passed. Initial stack startup required building the new project's missing frontend image; no database reset or runtime fallback was used.

## Verified scenarios

1. Actual seed implementation creates a Platform Admin twice idempotently. Incorrect password fails; correct password completes without email/MFA, platform APIs succeed and organization workspace access is denied.
2. Organization Administrator creates an Expert invitation with exactly one radio selection. Actual mail activation/password setting persists DOMAIN_EXPERT; login enters `/expert/target-roles`, reload retains the role and shared header uses the real identity.
3. Equivalent L&D Manager flow persists LD_MANAGER and enters `/ld-manager/occupations`.
4. Equivalent Employee flow requires real same-organization department/occupation and an available seat, persists EMPLOYEE and enters `/employee/overview`.
5. All three flows reject direct multi-role invitation requests, consumed-token replay, administrative/platform API access and wrong-role pages. None prompts for MFA. Desktop/mobile screenshots include role layouts and EN/VI activation/error states.
6. Full Administrator directory/create/detail/edit/deactivate/reactivate regression passes with single-role replacement: Employee -> Expert releases the seat, replacement back to Employee reacquires it, and deactivation/reactivation preserves history. The singular Users alias, sidebar, filters, real identity/logout and navigation-only demo links remain covered.
7. Captured payment email contains real MIME CID logo attachment and the shared HTML references it. Mobile preview resolves that CID to the identical bundled image bytes; screenshot inspected for the supplied orange icon/dark wordmark and responsive layout. Unit MIME checks establish the shared sender includes the image for all current transactional messages.

Browser page errors and failed requests were asserted empty for the role-entry flows. This verifies account/role/activation/branding, not the persistence of unrelated prototype learning/catalog content in existing destination pages.

## Artifacts

`frontend/test-results/identity-r1-final` contains:

- `platform-password-only.png`
- `activation-desktop.png`, `activation-mobile-vi.png`
- `assigned-role-desktop.png`, `assigned-role-mobile.png` for each invited role
- `mail-logo-mobile.png`
- Administrator regression screenshots

Password fields are masked in activation captures. Actual dev credentials were subsequently used for a no-trace/no-screenshot login check and were never printed.

## Manual checklist

Actual updated development URL: `http://localhost:8088/login`.

1. Configure `PLATFORM_ADMIN_SEED_EMAIL` and `PLATFORM_ADMIN_SEED_PASSWORD` privately in the existing ignored `.env`; do not overwrite other configuration. Password is 12-128 characters.
2. After migrations, run `docker compose -f compose.dev.yml run --rm --no-deps platform-seed`. It does not expose a public seed API. Matching reruns do not duplicate or reset the account; conflicting email/password configuration fails explicitly.
3. Sign in with that Platform Admin. Expect no email/MFA step, platform landing and authorized platform APIs. Organization membership is not granted.
4. Sign in as an Organization Administrator using the existing email/MFA flow. Open `/admin/users` (`/admin/user` redirects).
5. Create one Expert, one L&D Manager and one Employee. Select one role only. Employee needs real department/occupation references and free capacity; missing reference data is an upstream prerequisite, not fabricated by this change.
6. Activate from each recipient's email, choose a password and sign in. Use the existing Continue action: expect Expert, L&D and Employee layouts respectively and the actual user's header identity.
7. Refresh; verify persisted role and denied access to other role/organization surfaces. Edit a role as administrator: it replaces, rather than adds to, the old role. Confirm relevant seat changes.
8. Inspect verification/activation/payment mail in the isolated inbox: supplied brand icon/wordmark, plaintext alternative and readable content. No remote image fetch is required.
9. Exercise missing/invalid/reused activation token and mismatched/short password; verify explicit errors, field focus and no unintended account creation. Repeat at 390px and in VI.

No live email inbox/provider acceptance is certified. No unrelated role-page redesign, department/occupation CRUD or production deployment is included.

After verification the identity-test stack was stopped with volumes retained. Updated dev web/API/PostgreSQL/Neo4j remain running; final API health was UP and `/activate` returned HTTP 200. The pre-V12 PostgreSQL backup is retained privately outside the repository. No credentials were committed or included in browser traces.

```text
backend/integration: PASS - exit_code 0, 59 tests
frontend: PASS - exit_code 0, 40 tests, build and lint (existing warnings retained)
browser: PASS - exit_code 0, 6 scenarios
dev: PASS - V12, one configured seed, health UP, actual password-only login/platform API/logout verified
```
