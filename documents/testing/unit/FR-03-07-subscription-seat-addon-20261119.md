# FR-03.07 Purchase additional Employee seats — unit/component evidence (2026-11-19)

**Scope:** local/dev slice. Organization Administrators buy 1–50 extra Employee seats for the current paid period (prorated), keep them on same-plan renewals, reduce them from the next renewal and pay the shortfall of an already scheduled period. Live payOS is excluded.

**Environment:** Windows 11, Java 21 (Maven), Node/npm, Vitest 5.

## Backend (JUnit)

**Command:** `cd backend; .\mvnw.cmd -q test "-Dtest=SeatAddonPricingTest"`

| ID | Scenario | Result |
| --- | --- | --- |
| U-B01 | `SeatAddonPricingTest`: full-period price is `ceil(plan price / plan seats)` × quantity (4,900 VND / 20 seats × 3 = 735 VND); current-period price is prorated by remaining time, rounded up, never 0; only quantities 1–50 are valid | Passed (3/3) |

## Frontend (Vitest)

**Command:** `cd frontend; npx.cmd vitest run src/features/administration/subscription src/features/subscription src/features/administration/dashboard`

| ID | Scenario | Result |
| --- | --- | --- |
| U-F01 | `SeatAddonPanel.test.tsx`: included/additional/total seats of the current period | Passed |
| U-F02 | Quantity 51 shows a "1 to 50" alert; a valid quote then creates the order and refreshes when it is already applied | Passed |
| U-F03 | A pending order without a checkout link opens `/admin/subscription/payment-result?order=…` instead of refreshing (regression found by the system run) | Passed |
| U-F04 | Scheduled-period shortfall banner and fixed-quantity payment dialog; disabled actions while a renewal/seat payment is unresolved | Passed |
| U-F05 | Reducing the renewal add-on sends the expected current value | Passed |
| U-F06 | `PlanCatalog.test.tsx`: a same-plan renewal shows a 735 VND add-on and a 5,635 VND total and sends `expectedAddonSeats: 3`; another plan resets the add-ons | Passed |
| U-F07 | Existing fixtures (`adminDashboardMetrics.test.ts`, `PaymentStatusPanel.test.tsx`) updated for the new order/period fields | Passed |

Total: 9 files, 58 passed, 1 failed.

**Unrelated failure:** `WorkspaceBoundary.test.tsx` › "reports another organization workspace as not found…" expects `/workspace/acme/expert/target-roles` but the router produces `/roles`. The file and route are untouched by this slice.

## Static checks

| Check | Command | Result |
| --- | --- | --- |
| Lint | `cd frontend; npm.cmd run lint` (oxlint `--deny-warnings`) | Passed |
| Build/typecheck | `cd frontend; npm.cmd run build` (`tsc -b && vite build`) | Passed |
