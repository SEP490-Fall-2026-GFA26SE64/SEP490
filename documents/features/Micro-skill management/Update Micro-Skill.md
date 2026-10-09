# Update Micro-Skill

**Function ID:** REQ-012-F03  
**Actor:** Domain Expert  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-012](../../testing/unit/REQ-012-micro-skill-management.md), [integration/REQ-012](../../testing/integration/REQ-012-micro-skill-management.md), [system/REQ-012](../../testing/system/REQ-012-micro-skill-management.md)  
**Feature:** [Micro-Skill Management](README.md)

## Description

Change an existing authorized micro-skill's attributes while preserving graph consistency and relationship integrity.

**Input:** Micro-skill ID, edited name, description, and status (`ACTIVE` / `INACTIVE`).  
**Outcome:** Updated skill metadata persisted to Neo4j.

## Confirmed Rules

- **Editable Attributes:** `name`, `description`, `status`. `code` is immutable to preserve foreign references and ontological lineage.
- **Timestamp Integrity:** `updatedAt` is refreshed to current UTC instant.
- **REST Endpoint:** `PUT /api/v1/organizations/{organizationId}/micro-skills/{skillId}`
- **Security RBAC:** Restricted to Domain Experts and L&D Managers; returns `403 Forbidden` for Learners.

## Acceptance Baseline

Only an authorized expert can update the skill; historical references must not become corrupted.