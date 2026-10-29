# REQ-022: Administrator User Management W2 — API and Persistence

**Date:** 2026-10-26. **Environment:** Java 21, PostgreSQL 17.6 Testcontainers, existing V1-V11 schema, real HTTP/JDBC sessions and TOTP. Synthetic fixtures only.

## Runs

| Actual command / selector | Result |
| --- | --- |
| `PaymentOrderPostgresIntegrationTest,HexagonalArchitectureTest` after first profile implementation | 21 passed, exit 0 |
| `SubscriptionPlanApiIntegrationTest,WorkspaceAuthenticationServiceTest,RegistrationApiIntegrationTest,HexagonalArchitectureTest` | 18 passed, exit 0 |
| `PaymentOrderPostgresIntegrationTest,SubscriptionPlanApiIntegrationTest,RegistrationPostgresIntegrationTest,WorkspaceAuthenticationServiceTest,HexagonalArchitectureTest` | 50 passed, exit 0 at 19:19:15 +07:00 |
| `MemberProfileUpdateTest,SubscriptionAccessPolicyTest,SubscriptionPlanApiIntegrationTest,PaymentOrderPostgresIntegrationTest,HexagonalArchitectureTest` | Final focused check: 36 passed, exit 0 at 19:25:30 +07:00 |

All selectors use `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=..." test`. Counts overlap; do not sum them as unique tests.

## Verified Behavior

- Administrator updates name/organization roles/department/occupation under a real same-organization membership. Expected revision must match; stale edits return 409.
- Email, password hash and original registration name/verification history remain unchanged. Workspace reads prefer the mutable workspace profile while registration resume retains its original snapshot. A newly required profile row copies only the actual established verification timestamp.
- Unchanged historical inactive assignment references are preserved and their real labels remain visible. New foreign-organization or invalid department/occupation references are rejected.
- Employee assignments remain mandatory. Adding Employee through the edit operation cannot exceed capacity; the failed transaction preserves name, roles, assignment and revision.
- Last active Administrator cannot be removed. Existing account/membership activation and concurrent final-seat tests continue passing.
- Expired subscription rejects ordinary profile edits but permits the prior bounded membership deactivation remedy. Suspension denies Users directory/invitation/reference reads while still permitting authorized billing reads.
- HTTP tests verify real authentication/MFA, CSRF, cross-organization denial, no email mutation from injected input and immediate updated workspace-name visibility.
- Pending activation list exposes actual name/email/roles/assignment labels, expiry and delivery state, never proof/hash/encrypted token fields. It does not create a member or consume a seat. Expiry and resend update one pending request, not duplicate users.

## Current API/Field Mapping

| Operation | Contract |
| --- | --- |
| GET `/api/v1/organizations/{org}/subscription/members` | Existing owner-scoped list extended with `departmentName`, `occupationName`, `accountActive`; preserves existing IDs, roles, references, active flag and revision. |
| PUT `/api/v1/organizations/{org}/subscription/members/{member}/profile` | `{fullName, roles, departmentId, occupationReferenceId, revision}`. Returns the persisted authorized member projection. No email/password/MFA/platform-role input is accepted as an update. |
| PUT `/api/v1/organizations/{org}/subscription/members/{member}` | Existing membership active/roles/revision operation; no hard deletion. |
| GET `/api/v1/organizations/{org}/subscription/activations` | Unconsumed activation requests with PENDING/EXPIRED state and truthful delivery status. Missing delivery work is NOT_REQUESTED, not fabricated success. |
| POST `/api/v1/organizations/{org}/subscription/activations` | Existing activation/resend workflow and cooldown/limits preserved. |
| GET own subscription summary | Adds read-only `organizationName` from the actual organization record for layout display. |

No schema change or migration; existing account/profile/member/reference/activation/audit tables are used. No live records were changed by these tests.
