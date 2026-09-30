# System Testing

Run system tests against the complete Compose stack, not a standalone Spring Boot `starter` profile. Current smoke coverage verifies service startup, Flyway/graph initialization, health, and frontend-to-API proxying; it does not prove any draft feature workflow.

```powershell
docker compose -f compose.dev.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Expected baseline: databases healthy, `migrate` exited with code 0, API healthy, and status reports `adapt-learn-graph`. A fresh dev graph includes the example Java role; the production graph stays empty. Keep test accounts and payment credentials out of production smoke data.

When user workflows exist, add end-to-end cases for employee role selection and baseline, expert graph editing and pathway review, organization-scoped account access, module assessment/recalculation, and subscription payment confirmation. Pin each scenario to a clarified `REQ-nnn-Fnn` rule, specify actor/organization and setup data, and capture outcome and date. Browser automation and external-provider test doubles are not installed in this baseline; choose them with the first implemented workflow.

REQ-001-F01 is the first approved workflow test cluster; its full-stack scenario is tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). Until a browser runner is selected, API-level Compose checks must be labeled as partial system evidence and may not claim the frontend states passed.
