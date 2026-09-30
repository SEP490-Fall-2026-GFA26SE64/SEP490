# View Assigned Target Roles

**Function ID:** REQ-011-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Assigned Target Roles](README.md)

## Description

List target roles assigned to the authenticated Domain Expert (`assignedExpertId = X-User-Id`) within the organization and open the corresponding authorized role-management workspace for micro-skill authoring and threshold benchmarking.

**Input:** Domain Expert identity (`X-User-Id`), role context (`X-User-Role: DOMAIN_EXPERT`), and organization context (`organizationId`).  
**Outcome:** A filtered list of authorized target-role workspaces exclusively belonging to the expert.

## Confirmed Related Rules

- **Domain Expert Isolation**: Domain Experts can strictly only view target roles assigned to their specific expert ID (`assignedExpertId == authenticatedExpertId`). Unassigned roles or roles assigned to other experts are completely filtered out of query results.
- **Header Persona Switcher**: In demo/staging environments, experts can seamlessly switch persona identities via a searchable combobox to audit their respective assignment queues.
- **Read-Only Macro Metadata**: Experts cannot edit role codes, titles, domains, tracks, or family metadata defined by L&D Managers; they are exclusively authorized to configure micro-skill targets and submit publication or rejection decisions.
- **Display Ordering Rule**: In target role catalogs, any successor draft, sent, or rejected version is always ordered immediately below its previous published version within the same lineage (e.g., `v1.1 DRAFT/SENT` is positioned directly beneath `v1.0 PUBLISHED`).
- **Sent Role Presentation**: Target roles dispatched by the L&D Manager appear in the Expert workspace as "Draft" (ready for authoring, rather than "Action Required").

## Acceptance Baseline

An expert cannot use this workspace to view or manage a role outside their authorized assignments.

- **Unit Test Evidence:** `TargetRoleServiceTest.listsRolesFilteredByAssignedExpert`, `TargetRoleControllerTest.getTargetRoleReturns403ForUnassignedExpert`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (Neo4j Cypher filtering on `assignedExpertId`)