# FR-03.07 Purchase additional Employee seats — integration evidence (2026-11-19)

**Scope:** local/dev slice; the payment provider is the in-process test double. Live payOS is excluded.

**Environment:** Windows 11, Java 21, Docker Desktop (Testcontainers PostgreSQL), Flyway migrations `V76__subscription_seat_addons.sql` (subscription), workspace `V77` and module `V74`.

## Persistence / transaction (Testcontainers PostgreSQL)

**Command:** `cd backend; .\mvnw.cmd -q test "-Dtest=PaymentOrderPostgresIntegrationTest"`
**Result:** 35/35 Passed. All earlier purchase, renewal, webhook and seat tests still pass.

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| I-01 | `currentSeatAddonRaisesCapacityAndSamePlanRenewalCarriesTheSeats` | The prorated INCREASE order is applied once on a verified payment. Allocated seats and the admission limit go up. A same-plan renewal prices and stores the add-ons in the new period. | Passed |
| I-02 | `seatAddonGuardsRejectInvalidStaleDuplicateAndUnauthorizedRequests` | Rejects: quantity outside 1–50, a stale `expectedAddonSeats` (409), a second purchase while a renewal or seat order is unresolved, a non-ACTIVE period, and another organization. No state changes. | Passed |
| I-03 | `reductionAppliesAtRenewalWithinUsedSeatsAndADifferentPlanResetsAddons` | The reduction only changes the desired renewal add-on. The current period keeps its seats and there is no refund. A reduction is blocked below active Employees. A different-plan renewal resets add-ons to 0. | Passed |
| I-04 | `currentIncreaseWithAScheduledPeriodNeedsAFullPriceShortfallPayment` | An increase while a period is scheduled leaves a shortfall. The admission limit stays at the scheduled ceiling until a SHORTFALL order is paid at full per-seat price. | Passed |
| I-05 | `databaseRejectsMutatingAppliedSeatAddonsAndTheirOrderSnapshots` | The database rejects updates and deletes of applied seat add-ons (`subscription_seat_addon_immutable` trigger) and of their order price snapshots. | Passed |

## API / security (Spring MockMvc)

**Command:** `cd backend; .\mvnw.cmd -q test "-Dtest=SubscriptionPlanApiIntegrationTest"`
**Result:** 7/7 Passed.

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| I-06 | `seatAddonRoutesRequireTheOrganizationAdministratorCsrfAndValidInput` | `GET …/seat-addons/quote`, `POST …/seat-addons/orders` and `PUT …/seat-addons` (under `/api/v1/organizations/{organizationId}/subscription`) require an authenticated Organization Administrator and CSRF, and reject invalid input with 400. | Passed |

## Unrelated failure

`JpaSchemaValidationIntegrationTest` fails on module-migration lineage (missing `registration_org_structure`), in tables outside this slice. It was not fixed here.
