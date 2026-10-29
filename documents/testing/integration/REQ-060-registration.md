# REQ-060-F01-F03: PostgreSQL, HTTP and delivery evidence

**Contract:** [Approved revision 12](../../features/Organization%20onboarding/README.md#implementation-brief-registration-first).
**Date:** 2026-10-21. **Result:** Passed at this tier. Live Gmail remains separately blocked.

## Environment

Java 21.0.6, Docker 28.1.1, PostgreSQL 17.6-alpine in disposable Testcontainers. Forward Flyway V1-V8; no shared database reset. PostgreSQL contains the real account, registration, proof, MFA/recovery, rate, session, outbox/job and audit state.

| Acceptance | Scenario / expected outcome | Actual result |
| --- | --- | --- |
| AC-01 | Required fields and server times round-trip; optional fields and incomplete timestamps remain null; password is hashed; no organization/unit/roles are provisioned. | Passed. All five industries and four headcount choices also round-trip independently. |
| AC-02 | Concurrent/case-varied duplicate signup creates one account/registration. Supplied-slug conflict rolls back account creation. Generated collision retries; exhaustion rolls back. | Passed. Four concurrent signup calls produce one creation and three conflicts. Controlled suffix generation is a test-only spy. |
| AC-03 | 60-second resend cooldown; five sends/hour/account; old/consumed/expired proof rejection; failure counters survive service reconstruction. | Passed, including exact 600-second proof expiry and durable cooldown. |
| AC-03 | SMTP outage retains registration, schedules retry, retries successfully; old/expired/consumed jobs are suppressed. | Passed with real PostgreSQL jobs and an isolated SMTP-adapter double. Actual SMTP is separately exercised with Mailpit. |
| AC-03 | Five failed SMTP attempts become FAILED; expired fifth-attempt lease cannot remain pending forever. | Passed; next-retry timing, attempt counts, terminal status and preserved registration asserted. |
| AC-04 | Email alone cannot complete registration; another password-only session cannot inherit enrollment authority; normal resume needs TOTP. | Passed. Completion produces server timestamps and saved fields only after MFA. |
| AC-04, AC-05 | Concurrent identical TOTP/recovery proof succeeds once. Recovery revokes prior sessions and replaces old factors/codes. | Passed: one FULL/one INVALID_PROOF; one RECOVERY/one UNAUTHENTICATED; one consumed recovery row. |
| AC-06 | Fresh authenticated resume restores same registration and nullable fields. Restricted absolute lifetime is 600 seconds; full absolute lifetime is 12 hours. | Passed. Real API restart is recorded at the system tier. |
| AC-07 | Five account failures/15 minutes and 20 shared-IP failures/15 minutes block; exact 900-second cooldown restores access. Ten signup requests and 20 email sends/IP/hour are enforced. | Passed without process-local counters or client identity trust. |
| AC-06, AC-07 | Real HTTP cookies, CSRF, scope transitions, session rotation, unrelated endpoint denial, invalid input and unchanged credentials on duplicate signup. | Passed; cookies are HttpOnly/SameSite=Lax with registration-only path. Local HTTP test intentionally disables Secure. |
| AC-06, AC-07 | A second authenticated registrant supplies another account ID and a forged organization selector to current-view lookup. | Passed; response remains the second registrant's restricted view; the first owner's email/view is unchanged. Final HTTP rerun: 4/4 at 19:36 +07:00. |
| AC-06, AC-07 | Spring Session JDBC uses 600-second restricted / 1800-second full idle limits; expired restricted session cannot read registration but sign-in resumes the retained record. | Passed; expiry fixture changes only its disposable session timestamps, not application validation. |
| AC-07 | Existing schema invariants and migration reruns remain valid. | `DatabaseSchemaTest`: 1 passed with V8. |

## Executable suites and commands

- [RegistrationPostgresIntegrationTest.java](../../../backend/src/test/java/com/adaptlearngraph/identity/infrastructure/RegistrationPostgresIntegrationTest.java): **17 passed** in the final focused rerun.
- [RegistrationApiIntegrationTest.java](../../../backend/src/test/java/com/adaptlearngraph/identity/api/RegistrationApiIntegrationTest.java): **4 passed** in the final API/profile regression rerun.
- [V8 migration](../../../backend/src/main/resources/db/workspace-migration/V8__organization_registration.sql): applied successfully to disposable containers and isolated Compose.

From `backend`:

```powershell
.\mvnw.cmd '-Dtest=RegistrationPostgresIntegrationTest,RegistrationCryptographyTest' test
.\mvnw.cmd '-Dtest=RegistrationApiIntegrationTest,SystemStatusTest,WorkerProfileTest,HexagonalArchitectureTest,TargetRoleProductionBoundaryTest,TargetRoleSelectionProductionBoundaryTest' test
```

Results: 22/22 and 14/14 respectively, zero failures/errors/skips. The original schema test passed in the earlier 36-test combined run. These counts overlap other tiers and must not be added together as distinct tests.

The mail worker tests postpone unrelated pending jobs inside their disposable database so assertions exercise only that test's job. They do not alter real runtime verification, production throttles or shared registration data.

## Storage and privacy evidence

- Registration accounts have null organization/unit and zero roles. Registration/slug reservation does not provision a workspace.
- Email codes are HMAC-protected; delivery payloads contain only encrypted proof. TOTP secrets use purpose-bound AES-GCM; recovery codes are hash-only.
- Pending enrollment is session-bound. Recovery increments authorization version and makes old actors unusable; old session rows may remain until normal expiry.
- Required registration fields are full-session-only DTO projections. Partial sessions intentionally omit them and registration ID; permitted nulls are not fabricated.
- PostgreSQL catalog generation confirmed **60 platform tables** after V8. [Updated PostgreSQL diagram](../../diagrams/postgresql.puml) includes all seven new tables and their columns/FKs.

No Neo4j schema changes, real payment operations, workspace memberships or production authentication certification are implied.

## Revision 13: Public landing (2026-10-21)

Database, migration, backend/API-security and Testcontainers checks are **Not Applicable to this frontend-only change**: no persistence, domain, API payload or authorization behavior changed. The earlier revision 12 results above remain historical evidence, not new executions. Registration component/API regression tests were rerun, and the real dev registration/resume pages were reached without submitting accounts or sending mail; see [unit](../unit/REQ-060-registration.md#revision-13-public-landing-2026-10-21) and [system](../system/REQ-060-registration.md#revision-13-public-landing-2026-10-21) evidence. Live Gmail AC-09 remains Blocked.
