# Reassign Target Role Expert

## Current Scope Alignment
L&D Manager reassigns/removes role ownership under agreed eligibility/history rules; discipline authoring access remains separately assigned. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-024-F02  
**Actor:** L&D Manager / Organization Administrator  
**Status:** Implemented  
**Feature:** [Expert Assignment](README.md)

## Description

Change the assigned Domain Expert responsible for an organization target role (`assignedExpertId`) and update the corresponding management access immediately.

**Input:** Target role ID, organization ID, and new assigned expert ID (`assignedExpertId`).  
**Outcome:** Updated target role record with newly assigned expert ID.

## Confirmed Related Rules

- **Immediate Access Transfer**: When `assignedExpertId` is modified, the new expert immediately gains access in their Expert Portal workspace, while the previous expert loses access to the role.
- **Editable in Draft Mode**: L&D Managers can reassign experts during draft role authoring via the Edit Target Role dialog or API (`PUT /api/v1/organizations/{orgId}/target-roles/{roleId}`).

## Acceptance Baseline

Responsibility changes enforce the newly agreed access scope without crossing tenant boundaries.

- **Unit Test Evidence:** `TargetRoleDomainTest.updateDetailsModifiesMetadata`, `TargetRoleServiceTest.updatesTargetRoleSuccessfully`, `TargetRoleControllerTest.updateTargetRoleReturns200`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (verifies updating `assignedExpertId` and Cypher filter)