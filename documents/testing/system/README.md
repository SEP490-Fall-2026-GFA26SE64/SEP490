# System Testing Directory & Standards

**Location:** Docker Compose Environment (`compose.dev.yml`) and Browser Workflows

System testing validates complete end-to-end integration across all system tiers (PostgreSQL database, Neo4j graph database, Flyway/graph migrations, Spring Boot REST API, Vite frontend web client, and Nginx reverse proxy).

> [!NOTE]
> Detailed test scenarios, environment scopes, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Workflows Covered | System Test Document | Manual Procedure | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001-F01** | View Target Roles | Learner Role Catalog Browse | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | [REQ-001-F01-manual-browser-check.md](REQ-001-F01-manual-browser-check.md) | **PASSED** (API) / Manual Available |
| **REQ-011** | Assigned Target Roles | Expert Queue Isolation | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Micro-Skill Catalog & Linking | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | — | **PASSED** |
| **REQ-015** | Role Requirements | Micro-Skill Benchmark Authoring | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-023** | Target Role Management | Full Target Role Lifecycle | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Role Assignment & Reassignment | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#2-ld-manager-workflow-assigning--reassigning-experts-req-024) | **PASSED** |

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
