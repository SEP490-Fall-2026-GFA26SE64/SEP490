# Update Target Role

**Function ID:** REQ-023-F03  
**Actor:** L&D Manager  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Update target-role metadata and Domain Expert assignment. Changes to micro-skill requirements remain exclusively the responsibility of assigned Domain Experts.

**Input:** Organization target role ID and edited fields: Role Title (`name`), Job Domain (`domainCode`), Career Family (`familyCode`), Track (`track`), Assigned Domain Expert (`assignedExpertId`), and Profile Description (`description`).  
**Outcome:** Updated role details in Neo4j.

## Confirmed Rules

- **L&D Manager Scope**: L&D Managers can only edit the fields they create (title, domain, family, track, assigned expert, description). They **cannot** add or edit micro-skill requirements (which is exclusively the Domain Expert's role).
- **Assigned Expert Isolation**: When an expert is assigned or changed, other experts lose visibility into this role. Only the assigned expert can view and configure the target role in their Expert Portal.
- **Draft Mode Mutability**: In Draft status, all metadata fields are editable. Published roles require creating a successor draft to alter structural attributes.

## Acceptance Baseline

Administrative metadata changes do not silently modify the role's skill requirements or erase existing role selections.

- **Unit Test Evidence:** `TargetRoleDomainTest.updateDetailsModifiesMetadata`, `TargetRoleServiceTest.updatesTargetRoleSuccessfully`, `TargetRoleControllerTest.updateTargetRoleReturns200`, `TargetRoleControllerTest.updateTargetRoleReturns403ForLearner`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (verifies `role.updateDetails(...)` persists to Neo4j)