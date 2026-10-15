# Update Target Role

## Current Scope Alignment
L&D updates role details and assignment/configuration status, not Expert-authored competency requirements. Publication remains a separate action after completed configuration. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-023-F03  
**Actor:** L&D Manager  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Update target-role metadata and Domain Expert assignment. Changes to micro-skill requirements remain exclusively the responsibility of assigned Domain Experts.

**Input:** Organization target role ID and edited fields: Role Title (`name`), Job Domain (`domainCode`), Career Family (`familyCode`), Track (`track`), Seniority (`seniority`), Key Responsibilities (`responsibilities`), Assigned Domain Expert (`assignedExpertId`), and Profile Description (`description`).  
**Outcome:** Updated role details in Neo4j.

## Confirmed Rules

- **L&D Manager Scope**: L&D Managers can only edit the fields they govern (title, domain, family, track, seniority, responsibilities, assigned expert, description). They **cannot** add or edit micro-skill requirements (which is exclusively the Domain Expert's role).
- **Track & Seniority Consistency**: If track is updated, seniority must match the valid spectrum (`P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`). Track-seniority mismatches are rejected with `400 Bad Request`.
- **Responsibilities Modification**: L&D Managers can add, reorder, or update the list of strings representing job responsibilities for the Job Description.
- **Assigned Expert Isolation**: When an expert is assigned or changed, other experts lose visibility into this role. Only the assigned expert can view and configure the target role in their Expert Portal.
- **Status Lifecycle Transitions**: Both L&D Managers and assigned Domain Experts can transition the status:
  - L&D Manager: transitions to `SENT` when dispatching to Domain Expert, or `ACTIVE` when publishing directly.
  - Domain Expert: transitions to `ACTIVE` (Published) or `REJECTED` for target roles assigned to their expert ID. Unassigned experts are rejected with `403 Forbidden`.

## Acceptance Baseline

Administrative metadata changes do not silently modify the role's skill requirements or erase existing role selections. Status updates persist directly to the database so that reloading preserves the updated status.

- **Unit Test Evidence:** `TargetRoleDomainTest.updateDetailsModifiesMetadata`, `TargetRoleServiceTest.updatesTargetRoleSuccessfully`, `TargetRoleControllerTest.updateTargetRoleReturns200`, `TargetRoleControllerTest.updateTargetRoleReturns403ForLearner`, `TargetRoleControllerTest.updateTargetRoleReturns200ForAssignedExpert`, `TargetRoleControllerTest.updateTargetRoleReturns403ForUnassignedExpert`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation`, `PostgresTargetRoleRepositoryTest.saveUpdatesExistingRole` (verifies `status` and metadata updates persist to PostgreSQL)

