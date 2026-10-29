# REQ-032-F01: Backend Plan Configuration Evidence

**Date:** 2026-10-22. **Contract:** [Subscription Lifecycle revision 2](../../features/Subscription%20lifecycle/README.md#revision-2-implementation-overview).  
**Status:** Partial backend implementation verified; frontend and full SL-AC05/16 are Not Run. Not Complete.

## Environment and Commands

Java 21.0.6, Maven wrapper, PostgreSQL 17.6-alpine Testcontainers, real random-port Spring HTTP server, JDBC sessions and real password/TOTP verification. Synthetic accounts/organizations only; no retained database migration or live mail/payment.

| Time (+07:00) | Actual command from repository root | Result |
| --- | --- | --- |
| 21:13 | `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=SubscriptionSchemaIntegrationTest,DatabaseSchemaTest" test` | 4 passed; V1-V9 apply/rerun and legacy constraints, initial fields/nulls/history guards. |
| 21:21 | `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=SubscriptionCatalogServiceTest,SubscriptionPlanPostgresIntegrationTest" test` | 7 passed (4 service, 3 persistence). |
| 21:38 | `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=SubscriptionCatalogServiceTest,SubscriptionPlanApiIntegrationTest,HexagonalArchitectureTest" test` | 11 passed (5 service, 3 HTTP, 3 architecture). |

These runs preceded payOS SDK addition and the pending Jackson amendment. Repeat affected checks after that dependency change; do not assume these results validate the new dependency graph.

**Post-amendment rerun, 22:02:56 +07:00:** Under approved revision 3, the combined selector `Subscription*Test,WorkspaceAuthenticationServiceTest,ScopedSessionCookieSerializerTest,Registration*IntegrationTest,DatabaseSchemaTest,HexagonalArchitectureTest` passed **58 tests** with the actual SDK 2.0.1/Jackson 2.21.8 graph and V1-V10. This includes all suites listed above. The earlier failed/stale-class run and repair are preserved in [REQ-045 dependency evidence](../unit/REQ-045-provider-dependencies.md#approved-remediation-and-recheck).

## Verified Assertions

- Initial Starter/Growth/Enterprise names, descriptions, VND amounts, one-month durations and 20/50/200 seats persist. Seed creator remains null with explicit System provenance and actual migration time.
- Platform edits create a new version; every changed field and trusted editor/time persist, with an audit record. Old version values remain unchanged and direct history mutation is rejected.
- Two concurrent edits of the same expected version produce one winner and one explicit conflict. An unknown plan is not created.
- Real platform password-only authentication cannot access plan administration; real TOTP completion is required. A write without CSRF is rejected.
- Organization Administrator cannot access platform plan administration; one organization's authenticated administrator cannot read the other organization's route. A forged role header confers no authority.
- Revoking the platform grant takes effect despite an existing session. Plan responses omit internal creator IDs/timestamps and use `Cache-Control: no-store`.

## Remaining

Platform plan UI remains the existing browser prototype. No Playwright or UI persistence verification has run. Purchase-time stale-selection/order snapshot integration, payment processing and all other lifecycle phases remain unfinished.

## Completion Follow-up: 2026-10-23

The historical partial status above is superseded for the approved local slice. Real plan APIs/UI are connected; the [keyboard/mobile plan editor](../system/REQ-032-plan-configuration.md) passed. Full backend regression passed **233 tests**, and the final strict-input/auth/architecture follow-up passed **12 tests** at 12:12:35 +07:00. All frontend tests passed (**56**, bounded workers), and production build passed. Purchased snapshots remain immutable; no create/delete-plan workflow was added.
