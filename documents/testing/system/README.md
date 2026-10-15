# System Testing Directory & Standards

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and the [System Overview](../../adapt_learn_graph_system_overview.md). New end-to-end gates cover L&D disciplines/assignments/publication/approval, baseline/RIASEC -> Expert-reviewed role guidance -> Employee selection, generated pathway -> Expert confirmation -> learning, new-evidence adaptation, independent skill learning and L&D monitoring. Billing/PayOS/platform benchmark workflows are not current product gates.
Older browser checklists and PASSED labels below retain their original scope and require revision before they certify new workflows. No new runtime/browser result is claimed by this documentation-only update.

## Existing Execution Guides and Historical Evidence

**Location:** Docker Compose Environment (`compose.dev.yml`) and Browser Workflows

System testing validates complete end-to-end integration across all system tiers (PostgreSQL database, Neo4j graph database, Flyway/graph migrations, Spring Boot REST API, Vite frontend web client, and Nginx reverse proxy).

> [!NOTE]
> Detailed test scenarios, environment scopes, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Workflows Covered | System Test Document | Manual Procedure | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | Learner Role Catalog Browse | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | [REQ-001-F01-manual-browser-check.md](REQ-001-F01-manual-browser-check.md) | **PASSED** (API) / Manual Available |
| **REQ-001-F02** | Choose Target Role | Target Role Selection Flow | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | [Playwright Spec](../../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) | **PASSED** (Compose API & Playwright) |
| **REQ-002-F02** | Baseline Blueprint Authoring | Save, Generate, Replay, Review & Publish | [REQ-002-F02-baseline-authoring.md](REQ-002-F02-baseline-authoring.md) | [Playwright Spec](../../../frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts) | **PASSED** (Compose & Playwright) |
| **REQ-011** | Assigned Target Roles | Expert Queue Isolation | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Micro-Skill Catalog & Linking | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | [REQ-012-REQ-018-manual-browser-check.md](REQ-012-REQ-018-manual-browser-check.md) | **PASSED** |
| **REQ-015** | Role Requirements | Micro-Skill Benchmark Authoring | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-018** | Target-Role Graph Editing | Graph Visualization & Prerequisite Edges | [REQ-018-target-role-graph-editing.md](REQ-018-target-role-graph-editing.md) | [REQ-012-REQ-018-manual-browser-check.md](REQ-012-REQ-018-manual-browser-check.md) | **PASSED** |
| **REQ-023** | Target Role Management | Full Target Role Lifecycle | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Role Assignment & Reassignment | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#2-ld-manager-workflow-assigning--reassigning-experts-req-024) | **PASSED** |

---

## Evidence Summaries

- **REQ-001-F01**: The first approved workflow test cluster; its full-stack scenario is tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md).
- **REQ-001-F02**: System evidence ran on 2026-10-02 and is tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md). Compose API checks cover initial/replay/no-op/conflict/validation/unavailable/outage recovery plus stale, competing change, and assessment-active state preservation with a deterministic two-role local fixture. `npm.cmd run test:system:f02` passes two Playwright/headless-Chrome scenarios: a state-independent catalog/detail/Cancel/Confirm/UI flow and an API stale/competing-change flow.
- For revised user workflows, add end-to-end cases from the current scope section after the owning contracts are clarified. Pin each scenario to a `REQ-nnn-Fnn` acceptance rule, specify actor/assignment/setup data, and record outcome/date. Reuse the existing Playwright runner deliberately; do not mix browser specs into Vitest or treat earlier role-selection coverage as proof of reviewed guidance/publication.

---

## How to Run System Stack & Smoke Checks

Start the full Compose stack:
```powershell
docker compose -f compose.dev.yml up --build -d
```

Verify service health and readiness:
```powershell
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Expected baseline:
- Databases healthy (`postgres`, `neo4j`).
- `migrate` service exited with code 0.
- `api` healthy and responding to status queries.
- `web` reverse-proxy serving on `http://127.0.0.1:8088`.

---

## Standards for New Requirements

When writing system tests for a new requirement (`REQ-nnn`):
1. **Create a dedicated file**: `documents/testing/system/<REQ-ID>-<feature-slug>.md`.
2. **Define User Journeys**: Specify multi-tier workflows connecting user actions (in UI/API) to persistent state changes across PostgreSQL and Neo4j.
3. **Manual Browser Checklist**: If the requirement includes UI components, provide or link to a structured step-by-step manual browser testing checklist (`documents/testing/system/<REQ-ID>-manual-browser-check.md`).
4. **Link to this index**: Add the requirement to the table above.
