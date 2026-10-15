# Delete Micro-Skill

## Current Scope Alignment
Expert deactivates micro-skills in assigned disciplines; preserve historical references rather than assuming physical deletion. Legacy ID/name remains for traceability. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-012-F04  
**Actor:** Domain Expert  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-012](../../testing/unit/REQ-012-micro-skill-management.md), [integration/REQ-012](../../testing/integration/REQ-012-micro-skill-management.md), [system/REQ-012](../../testing/system/REQ-012-micro-skill-management.md)  
**Feature:** [Micro-Skill Management](README.md)

## Description

Remove a micro-skill from use within authorized scope without breaking recorded assessments, role requirements, or prerequisite relationships.

**Input:** Selected micro-skill ID and deletion request.  
**Outcome:** Physical deletion of unused node, or rejection with HTTP 409 Conflict if actively referenced.

## Confirmed Rules

- **Referential Integrity Guard:** Prior to deletion, the system queries Neo4j for:
  1. Role requirement edges: `MATCH (:TargetRole)-[:REQUIRES_SKILL]->(s:MicroSkill {id: $skillId})`
  2. Prerequisite edges: `MATCH (s:MicroSkill {id: $skillId})-[:PREREQUISITE_OF]-()`
  If any reference exists, deletion is rejected with `MicroSkillInUseException` (HTTP `409 Conflict`).
- **Unreferenced Deletion:** If zero references exist, node is cleanly detached and deleted from Neo4j.
- **REST Endpoint:** `DELETE /api/v1/organizations/{organizationId}/micro-skills/{skillId}`

## Acceptance Baseline

A deletion cannot silently leave invalid role, prerequisite, or historical evidence references.