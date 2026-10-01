# REQ-001-F01 — View Target Roles System Testing Plan & Evidence

**Feature Contract:** [REQ-001-F01 View Target Roles](../../features/Target%20role%20selection/View%20Target%20Roles.md)  
**Level:** System (Docker Compose Stack, Health Probes & Browser-Facing API Proxy)  
**Status:** PARTIAL (API/Compose Passed 2026-09-30; Automated Browser Suite Pending; Manual Check Procedure Available)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | AC01–AC10 | Complete Compose dev stack (`compose.dev.yml`), local actor, seeded catalog | Browse target roles list, search by keyword, filter by track/domain, view details | API proxy returns HTTP 200 with seeded target roles; UI displays all non-empty catalog metadata | Compose API smoke + Manual UI | **PASS (API)** / Manual Available |

---

## 2. Execution Evidence

```powershell
docker compose -f compose.dev.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
# Returned status: adapt-learn-graph, databases healthy

Invoke-RestMethod -Headers @{ "X-User-Role" = "LEARNER"; "X-Organization-Id" = "org-fpt" } http://127.0.0.1:8088/api/v1/organizations/org-fpt/target-roles
# Returned: 200 OK with seeded Java P3 Target Role
```

---

## 3. Manual Browser Verification

A comprehensive manual test checklist is provided in:
- [REQ-001-F01 Manual Browser Check](REQ-001-F01-manual-browser-check.md)
