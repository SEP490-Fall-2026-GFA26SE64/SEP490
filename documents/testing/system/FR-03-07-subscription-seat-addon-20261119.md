# FR-03.07 Purchase additional Employee seats — system evidence (2026-11-19)

**Scope:** local/dev slice using the isolated subscription test stack and its in-process payment double. Live payOS acceptance is **Not Run** (excluded by the approved scope).

**Stack:** Compose project `alg-seat-addon`, web `http://127.0.0.1:8092`, API `http://127.0.0.1:18084`, Mailpit `http://127.0.0.1:8029`. It was built from `compose.dev.yml` + `compose.subscription-test.yml` + `compose.organizations-test.yml` plus a session-local override:

- `api`: `REGISTRATION_MFA_ENABLED=true`. The shared subscription helpers enrol TOTP, and the current `compose.dev.yml` default disables it, which caused 403 responses.
- `web`: `DEV_WATCH_POLLING=false` and `CHOKIDAR_USEPOLLING=false`. Bind-mount polling slowed each proxied call to 1–5 s; with it off, calls take about 70 ms.

The stack was stopped with `stop` after the run, and volumes were kept.

## Seat add-on spec (Playwright, Chrome)

**Command:** `cd frontend; $env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'; npx.cmd playwright test --config=playwright.system.config.ts FR-03-07-subscription-seat-addon`
**Spec:** `frontend/system-tests/FR-03-07-subscription-seat-addon.spec.ts` — **2/2 Passed** (1.4 min).

Fixture: a new synthetic organization on the Starter plan (4,900 VND, 20 seats, so 245 VND per seat).

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| S-01 | Org Admin enters 51 seats (mobile 390×844) | A "1 to 50" alert is shown and **Calculate price** is disabled | Passed |
| S-02 | Buy 2 seats in the current period | A prorated quote of 490 VND. The payment result page opens. While the SEAT_ADDON order is pending, buying and renewing are blocked with a message. | Passed |
| S-03 | Payment confirmed, then reload | The panel shows 20 / 2 / 22. The API returns `allocatedSeats` 22. Mailpit receives an "Additional Employee seats" email with the order link. | Passed |
| S-04 | Reduce the renewal add-on to 1, then reload | Desired renewal add-on is 1; the current period still has 2 | Passed |
| S-05 | Same-plan renewal | The renewal line shows +1 seat. The order has `addonSeats` 1, `addonAmountVnd` 245 and a total of 5,145 VND. After payment, the scheduled period has 21 seats. | Passed |
| S-06 | Buy 1 seat while a period is scheduled | A scheduled-period hint is shown. After payment, the current add-on is 3, `scheduledShortfall` is 1, `admissionLimit` is 21 and the shortfall banner appears. | Passed |
| S-07 | Pay the shortfall | The quantity is fixed. The order kind is SHORTFALL at 245 VND. After payment, the shortfall is 0 and the scheduled period and admission limit are both 22. | Passed |
| S-08 | Final reload on desktop and mobile | Total 23 seats shown. No page errors and no failed requests during the flow. | Passed |
| S-09 | Another organization's admin calls quote, order and reduce on this organization | 403 for each. The owner's quote for 51 seats returns 400. The owner's state is unchanged. | Passed |

**Artifacts (inspected):** `seat-addon-invalid-mobile.png`, `seat-addon-dialog-mobile.png`, `seat-addon-applied-desktop.png`, `seat-addon-shortfall-desktop.png`, `seat-addon-final-desktop.png`, `seat-addon-final-mobile.png`, under `frontend/test-results/FR-03-07-subscription-seat-*-system-chrome/`. These are local run output and not tracked.

**Defect found and fixed:** the first run showed that `SeatAddonPanel` only left the dialog when the order already had a checkout URL. The provider attaches that URL asynchronously, so the dialog stayed open. The panel now opens `/admin/subscription/payment-result?order=…` for any order that is not yet applied. A Vitest regression test was added (unit evidence U-F03), and the spec was rerun and passed.

**Known UI limit:** on 390 px the existing payment-history table scrolls horizontally inside its card. This is unchanged by this slice.

## Regression on the same stack

| Spec | Result |
| --- | --- |
| `REQ-028-subscription-purchase` › guest purchase (line 8) | Passed |
| `REQ-066-subscription-renewal` › renewal (line 6), suspension (line 118) | Passed |
| `REQ-039-payment-email` | Passed on rerun. The first attempt hit `goto` `ERR_ABORTED` during a redirect. |
| `REQ-028` line 40 | Failed, unrelated: hardcodes the container `adapt-learn-graph-subscription-test-api-1`, so it can't run against another project name |
| `REQ-028` line 60 | Failed, unrelated: waits for a "Reconcile payment" button that no longer exists in the frontend |
| `REQ-066` line 48 | Failed, unrelated: looks for a `JobPosition` label that the current Create User dialog doesn't have |

## Manual checklist

See [REQ-066-subscription-manual-check.md](REQ-066-subscription-manual-check.md#additional-employee-seats-fr-0307).
