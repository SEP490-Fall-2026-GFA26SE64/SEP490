# REQ-066: Organization Subscription and Renewal

## R1 billing presentation and renewal email, 2026-10-26

All three organization scenarios passed in the final **8/8 billing/admin suite, exit 0**. Renewal now additionally asserts a distinct purchaser confirmation email linking to its Administrator receipt and successfully opens that receipt; immutable history, future-period continuity, seat/assignment rules and suspension remain verified. See [R1 evidence and manual checklist](REQ-039-onboarding-billing-refinement.md).

**Date:** 2026-10-23. **URL:** `http://127.0.0.1:8092/admin/subscription`.  
**Result:** The three organization scenarios passed within the final **7/7** lifecycle browser run.

## Verified Journeys

| Scenario | Actual outcome |
| --- | --- |
| Initial purchase -> entry -> renewal -> reload | Current paid end is preserved; one scheduled period begins there; a second advance renewal is disabled and rejected by the backend policy; payment history contains the two persisted orders |
| Employee invitation -> captured SMTP -> activation -> login | Administrator supplies full name/email/role/real department and occupation. Recipient sets their own password, signs in without MFA, and consumes one Employee seat. No administrator knows the chosen password |
| Platform suspension -> organization status -> reactivation | Suspended workspace cannot renew or access protected target-role/general workspace APIs; billing remains readable. Reactivation restores only otherwise eligible access |

The Employee test was subsequently strengthened to create **two fully provisioned organizations** rather than an unknown target ID. The focused rerun exited **0**, one passed in 58.1 seconds. Forged role/user headers cannot cross into the other organization's target-role, micro-skill, prerequisite or macro-competency APIs.

The final field-focused follow-up also asserts persisted full name, email, Employee role, department/occupation identifiers and active membership after activation. Its result is recorded with the final delivery matrix; prior successful runs remain historical evidence of their exact assertions.

**Field-focused result:** exit 0, one passed in **51.6 seconds**. All five entered fields and active membership round-trip through the real activation flow, and cross-organization requests use a second actually provisioned workspace.

## Evidence and Limits

- Desktop/mobile renewal screenshots are under `frontend/test-results/subscription-final/REQ-066-.../`; two-organization follow-up screenshots are under `frontend/test-results/subscription-isolation-final/`.
- The main renewal flow asserts no browser page errors or unexpected failed network requests.
- SMTP is Mailpit at `http://127.0.0.1:8029`, not Gmail. `PENDING`/queued email never claims inbox delivery.
- Actual department/occupation records are required in a non-test environment. Their management/import is an upstream dependency outside this task.
- [Seat/date/concurrency tests](../integration/REQ-062-subscription-entitlements.md) cover expiry, downgrade reservation, last-seat races and late paid capacity remediation beyond the browser happy paths.

Initial test failures were readiness races (reading identity/current-order before the handoff/create request completed) and stale Vite code from Windows mounts. Tests now wait for observable committed UI state; isolated Vite uses file polling. No business validation was weakened.

Acceptance: SL-AC08/09/10/11/12/14/16/17. [Manual checklist](REQ-066-subscription-manual-check.md).

**Final delivery rerun:** all seven lifecycle scenarios passed again (exit 0, 3.8 minutes), with Employee activation performed through the real `/admin/users` route and platform workspace controls reached through `/platform-admin/organizations`. The previous prototype account/suspension pages are no longer active routes. Full Employee field persistence, a second provisioned organization and forged-header denial are included in this final run. Latest artifacts: `frontend/test-results/subscription-delivery/`.
