# REQ-037: Subscription Workspace Authentication Support

**Date:** 2026-10-22. **Scope:** bounded support for [Subscription Lifecycle revision 2](../../features/Subscription%20lifecycle/README.md#revision-2-implementation-overview).

## Actual Verification

| Time (+07:00) | Actual Maven selector (`.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=..." test`) | Result |
| --- | --- | --- |
| 21:26 | `RegistrationPostgresIntegrationTest,RegistrationApiIntegrationTest,HexagonalArchitectureTest` | 24 passed: shared authentication attempt guard preserved 17 persistence/security, 4 registration HTTP and 3 architecture checks. |
| 21:30 | `WorkspaceAuthenticationServiceTest,DatabaseSchemaTest,HexagonalArchitectureTest` | 10 passed: 6 workspace policy tests, V1-V10 migration/rerun and 3 architecture checks. |
| 21:33 | `WorkspaceAuthenticationServiceTest,ScopedSessionCookieSerializerTest,RegistrationApiIntegrationTest,HexagonalArchitectureTest` | 16 passed: 6 workspace policy, 3 cookie isolation, 4 registration HTTP and 3 architecture checks. |
| 21:38 | `SubscriptionCatalogServiceTest,SubscriptionPlanApiIntegrationTest,HexagonalArchitectureTest` | 11 passed, including real workspace password/TOTP/session/CSRF use by the 3 plan API scenarios. |

Unit assertions cover password-only Employee, mandatory administrator TOTP, inability to inherit administrator authority after promotion, auth-version revocation, exact 12-hour/10-minute expiry and rejected unverified/unready identities. Cookie tests preserve registration-only authority, use a distinct workspace cookie, and verify secure/HttpOnly/SameSite attributes and the handoff cookie direction. Partial authentication responses withhold account/organization/profile/role metadata.

## Limits

Workspace identity has supporting service/API/persistence code, not a completed workspace-access feature. Registration-to-ready-workspace handoff, new-member email activation, generalized administrator enrollment/recovery, all protected-operation integration and browser sign-in remain to receive full integration/system coverage. The frontend login is still a prototype. V9/V10 were not applied to the retained development database.

Historical live Gmail AC-09 remains **Blocked**. No live email or real payment was performed.

**Post-amendment rerun, 22:02:56 +07:00:** All of the above suites passed within the **58-test** combined subscription/authentication/schema/architecture run using SDK 2.0.1, Jackson 2.21.8 and V1-V10. See [dependency recheck](REQ-045-provider-dependencies.md#approved-remediation-and-recheck) for the retained initial failure and explicit JDBC callback repair. This does not change the unfinished API/system/browser coverage noted above.

## Connected Lifecycle Follow-up: 2026-10-23

Real workspace login, registration handoff, recipient activation and route/API entitlement checks are connected. [Organization Playwright](../system/REQ-066-subscription-management.md) verifies password-only Employee sign-in, required assignment persistence, administrative TOTP and suspension/cross-organization restrictions. The final full backend run passed **233 tests**; strict plan/auth/ArchUnit follow-up passed **12**. A password-only account promoted to administrator is explicitly sent to fresh sign-in rather than stranded at an incompatible TOTP challenge. Historical Gmail AC-09 remains Blocked.
