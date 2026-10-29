# REQ-062: Subscription Periods, Seats and Access

**Date:** 2026-10-23. **Contract:** [Subscription Lifecycle](../../features/Subscription%20lifecycle/README.md).  
**Result:** Local domain/persistence/API checks passed; supporting browser evidence is linked below.

## Actual Verification

The final `.\backend\mvnw.cmd -f .\backend\pom.xml test` run exited **0**, with **233 passed**, including:

| Acceptance | Executable evidence | Actual assertions |
| --- | --- | --- |
| SL-AC08 | `SubscriptionPlanTest`, `PaymentOrderPostgresIntegrationTest` | Vietnam calendar/UTC persistence, leap/non-leap February, original anniversary day, exclusive end, initial readiness start, active append and expired application-time start |
| SL-AC08/12 | `activeRenewalAppendsAndSecondFuturePurchaseIsRejected` | Current paid end is unchanged; next starts there; another future purchase is denied |
| SL-AC09 | `concurrentFinalSeatActivationHasOneWinnerAndExpiredSuspensionPoliciesHold` | With 19/20 seats used, two concurrent activations yield exactly one success and one capacity error; persisted use is 20 |
| SL-AC09 | `lowerSeatReservationAndLateCapacityRemediationRemainDurable` | Lower pending allocation constrains admission; trusted unpaid expiry releases it; late paid order with increased use waits for capacity; administrator reduction permits one scheduled period |
| SL-AC09/15 | `SubscriptionSchemaIntegrationTest` | Employee department/occupation are required, organization references cannot cross, non-Employee references may remain null |
| SL-AC10 | `SubscriptionAccessPolicyTest`, workspace authentication tests | Current account/membership/roles, administrator MFA, revocation, exact expiry and suspension precedence; billing recovery does not authorize general workspace use |
| SL-AC10/12 | `expiredRenewalStartsAtApplicationAndDoesNotClearAdministrativeSuspension` | Renewed paid time starts at actual application, while administrative suspension remains unchanged |
| SL-AC15 | `DatabaseSchemaTest`, `HexagonalArchitectureTest`, graph suites | Forward V1-V11 rerun, existing invariants and hexagonal boundaries; graph schema/organization-query regressions |

The shared workspace filter covers existing employee target-role/selection and organization target-role, graph, macro-competency, micro-skill and prerequisite API families. It derives organization and role from server sessions; legacy controller header parameters receive server-owned values, not browser values. Expert target-role item access additionally checks the actual assignment. Browser mutation helpers obtain CSRF; frontend route guards do not replace server checks.

## Supporting Runtime Evidence

[Organization lifecycle Playwright](../system/REQ-066-subscription-management.md) covers real SMTP activation, password-only Employee login, required assignment persistence, seat use, cross-organization denial, suspension/reactivation and billing access. Tests use isolated legitimate reference fixtures, not production defaults.

The real deployment still requires upstream department/occupation records. The UI reports their absence instead of creating demo data; department/occupation CRUD remains outside this subscription feature. No arbitrary seat override or automatic Employee deactivation is implemented.
