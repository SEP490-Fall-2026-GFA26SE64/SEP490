# Delete Target Role

## Current Scope Alignment
Role withdrawal uses L&D publication/lifecycle ownership; physical deletion, retention and impact on existing learning need agreement. Legacy ID remains for traceability, not a mandated destructive operation. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-023-F04  
**Actor:** L&D Manager  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Permanently remove an organization target role from the catalog (both `DRAFT` and `PUBLISHED` states) upon explicit L&D Manager confirmation. Deleting a target role cleanly removes the role node and detaches all prerequisite and requirement graph relationships without deleting underlying micro-skill definitions.

**Input:** Organization context (`organizationId`), target role ID (`roleId`), and caller role `LD_MANAGER`.  
**Outcome:** Permanent deletion of the target role from Neo4j (`MATCH (r:TargetRole) DETACH DELETE r`) and catalog synchronization.

## Confirmed Rules

- **Privilege Scope**: Exclusively accessible to L&D Managers (`LD_MANAGER`) and Administrators (`ADMIN`).
- **Draft & Published Lifecycle Deletion**: L&D Managers can delete both `DRAFT` roles (uncommitted configurations) and `PUBLISHED` roles (live career paths).
- **Graph Relationship Cleanup**: Uses `DETACH DELETE` in Neo4j so that all relationship edges (`REQUIRES_MICRO_SKILL`, `ASSIGNED_TO`) are safely removed, while shared `MicroSkill` nodes remain completely intact.
- **Safety Confirmations in UI**: Frontend displays context-aware confirmation dialogs:
  - For `DRAFT`: Warns that uncommitted configurations and thresholds will be discarded.
  - For `PUBLISHED`: Displays a high-visibility warning that active career pathways and diagnostic gap evaluations will no longer reference this profile.

## Acceptance Baseline

- Deleting a target role does not delete shared micro-skills in the ontology.
- API returns `204 No Content` on successful deletion.
- Unit and integration tests verify deletion of both draft and published roles.
- **Unit Test Evidence:** `TargetRoleServiceTest.deletesDraftAndPublishedRolesSuccessfully`, `TargetRoleControllerTest.deleteTargetRoleReturns204`, `TargetRoleControllerTest.deleteTargetRoleReturns403ForLearner`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (verifies `roleRepo.deleteById` removes node from Neo4j)
