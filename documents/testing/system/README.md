# System Testing

Run system tests against the complete Compose stack, not a standalone Spring Boot `starter` profile. Current smoke coverage verifies service startup, Flyway/graph initialization, health, and frontend-to-API proxying; it does not prove any draft feature workflow.

```powershell
docker compose -f compose.dev.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Expected baseline: databases healthy, `migrate` exited with code 0, API healthy, and status reports `adapt-learn-graph`. A fresh dev graph includes the example Java role; the production graph stays empty. Keep test accounts and payment credentials out of production smoke data.

When user workflows exist, add end-to-end cases for employee role selection and baseline, expert graph editing and pathway review, organization-scoped account access, module assessment/recalculation, and subscription payment confirmation. Pin each scenario to a clarified `REQ-nnn-Fnn` rule, specify actor/organization and setup data, and capture outcome and date. REQ-001-F02 introduces a pinned Playwright runner using an installed Chrome executable; reuse or extend it deliberately rather than mixing browser specs into Vitest.

REQ-001-F01 is the first approved workflow test cluster; its full-stack scenario is tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). REQ-001-F02 system evidence ran on 2026-10-02 and is tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md). Compose API checks cover initial/replay/no-op/conflict/validation/unavailable/outage recovery plus stale, competing change, and assessment-active state preservation with a deterministic two-role local fixture. `npm.cmd run test:system:f02` passes two Playwright/headless-Chrome scenarios: a state-independent catalog/detail/Cancel/Confirm/UI flow and an API stale/competing-change flow. This is local evidence and does not replace real owner-adapter integration.

Manual browser procedure: [REQ-001-F01 manual browser system check](REQ-001-F01-manual-browser-check.md). Record the actual browser/date/result in the function evidence file; the existence of this checklist is not evidence of a pass.
