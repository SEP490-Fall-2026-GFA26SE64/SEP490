# Optional integrations: real persistence evidence

Date: 2026-10-30. Scope: legacy REQ-060/061/028 and directly related onboarding/authentication/subscription behavior.

## Feature-only clean-main retest

On clean main `3302bda` plus only the integration-switch patch, **27 real database/API checks passed**, 0 failures/errors/skips, in the final **50-test** backend command (exit 0). The suite counts and behavioral boundaries in the table below remain 21/4/2. Registration API tests explicitly select `classpath:db/workspace-migration`.

Fresh databases applied **36 workspace migrations, ending at V37**. Main contains V1-V35; the unrelated uncommitted catalog V36 was intentionally excluded. No earlier migration was edited, and no placeholder V36 was introduced. The earlier combined-working-tree V1-V37 result below is historical, not the clean-main migration inventory.

## Historical combined-working-tree run

Environment: Windows, Java 21, Maven, Docker/Testcontainers, PostgreSQL 17.6 Alpine. Exact combined command/counts are in the [unit/API receipt](../unit/REQ-060-061-028-integration-flags-20261030.md). The following were included in that historical **52-test** total, not added to it.

| Suite | Final count | Actual checks / result |
| --- | ---: | --- |
| RegistrationPostgresIntegrationTest | 21 | Passed. Every email/MFA flag combination reaches the expected initial server stage. Email-off/MFA-on completes actual TOTP enrollment with real recovery codes and null email proof; email-on/MFA-off requires real email proof with no authenticator or false MFA claim. Reenabling an existing FULL bypass session requires real email and actual TOTP enrollment, then clears bypass markers. Existing registration field, nullability, proof, recovery and throttle regressions pass. |
| RegistrationApiIntegrationTest | 4 | Passed. Existing enabled-flow HTTP/security regression; no live mailbox. |
| PaymentOrderPostgresIntegrationTest, `developmentBypass*` | 2 | Passed. Fresh order becomes DEV_BYPASSED and APPLIED; repeated bypass/application produces exactly one subscription period and READY setup. Received amount, confirmation time and checkout/link remain null. Zero provider observations and payment-confirmation-email jobs. Enabled policy rejects bypass; existing external pending/paid orders cannot be overwritten. |

All selected integration checks: **27 passed**, 0 failures/errors/skips. PostgreSQL transactions, constraints and application stores are real; provider/SMTP delivery is not part of this receipt.

## Migration and runtime

- Fresh Testcontainers databases successfully applied workspace Flyway V1-V37. Existing migration files were not edited.
- The isolated Compose migration also applied V1-V37, then started the real API with local/workspace-baseline profiles. Final API image packaging succeeded; packaging skips tests, so it is not counted as another test run.
- V37 adds explicit registration bypass metadata and DEV_BYPASSED order timestamp/status constraints, preserving actual proof/payment nullability. No Neo4j schema changes.
- Integration assertions exercise preserved real payment evidence after toggling the policy. Migration of an arbitrary production backup was **Not run**; no production data was modified.
- No shared development volume, account, private environment or real payment/email was changed. Isolated test databases/volumes are separate; preserved Compose volumes were never removed.

Real browser/API reload, authorization and workspace handoff results are recorded separately in the [system receipt](../system/REQ-060-061-028-integration-flags-20261030.md). Live payOS/SMTP acceptance and unrelated learning/catalog workflows remain outside this slice.
