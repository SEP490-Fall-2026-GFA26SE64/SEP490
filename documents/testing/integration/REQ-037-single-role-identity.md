# Single-role persistence, activation and seed integration

Date: 2026-10-28. Scope: identity refinement R1; FR-03.01/03.03/07.01 and legacy REQ-022/037.

## PostgreSQL checks

Included in the [59-test final run](../unit/REQ-037-single-role-identity.md), exit 0. `PaymentOrderPostgresIntegrationTest` passed **24** scenarios on PostgreSQL 17.6 Testcontainers after applying V1-V12.

- Membership is committed with exactly one role; adding a second or deleting the sole role while retaining the membership fails.
- A Platform Administrator cannot acquire organization membership, and an organization account cannot receive a platform grant.
- Pending invitations must contain one role. Consumed historical invitation snapshots remain intact.
- Existing account, organization, registration, payment, purchased-plan and learning IDs are preserved. No schema reset or automatic role selection.
- Role replacement serializes seat admission, preserves assignments/history and protects the last active Organization Administrator.
- Seed twice with matching private input produces one account and grant. Conflicting existing identities fail without promotion or password overwrite.
- Platform seed has no registration/MFA/verification timestamps; legitimate nulls remain null.

`SubscriptionPlanApiIntegrationTest` additionally passed real HTTP sign-in and platform authorization without MFA/email proof, while retaining CSRF and organization isolation checks.

## Actual CLI and development update

The opt-in non-web `platform-seed` service was executed first against the fresh isolated identity stack using synthetic credentials. Exit 0; database lookup confirmed one platform account.

After isolated tests passed, the user-authorized dev update:

1. Compared resolved API environment internally to the running container: no drift; no values printed.
2. Confirmed no PENDING/RETRY/RUNNING jobs and no ambiguous membership roles.
3. Paused only the dev API, created and validated a private PostgreSQL custom-format backup outside the repository.
4. Ran the existing migration service with catalog reseeding disabled; database reached **V12**.
5. Ran `platform-seed` using privately configured environment values; one Platform Administrator exists.
6. Recreated only the API and restarted the frontend; API health returned UP.
7. Headless UI verification against `http://127.0.0.1:8088/login` passed: actual seed credentials, no MFA prompt, `mfaVerified=false`, only PLATFORM_ADMINISTRATOR, correct platform landing, plan API 200 and logout/current 401.

An initial dev verification script did not activate Compose's `tools` profile when reading seed configuration and therefore had no credentials to fill. Corrected to `docker compose --profile tools ... config`; values stayed private. The application seed itself had already succeeded and was not reset or duplicated.

No live email/payment operation, historical-data purge, secret logging or repository commit was performed.
