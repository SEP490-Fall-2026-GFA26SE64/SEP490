# Assign Target Role to Expert

**Function ID:** REQ-024-F01  
**Actor:** L&D Manager / Organization Administrator  
**Status:** Implemented  
**Feature:** [Expert Assignment](README.md)

## Description

Assign an organization target role to an eligible Domain Expert (`assignedExpertId`) who will author its detailed micro-skill proficiency benchmarks and maintain diagnostic gap requirements.

**Input:** Organization target role and selected domain expert ID from eligible experts (`assignedExpertId`).  
**Outcome:** A target role record with attached `assignedExpertId` determining workspace access control.

## Confirmed Related Rules

- **One Primary Expert per Role**: Each target role has one assigned Domain Expert (`assignedExpertId`) responsible for micro-skill threshold authoring and graph publication.
- **Searchable Dropdown Selection**: In Create and Edit modals, the expert selector uses a searchable combobox with expert title and name details.
- **Strict Role Scoping**: Only the assigned expert can view and author micro-skills for the role (`assignedExpertId == authenticatedExpertId`).

## Acceptance Baseline

The assignment grants only the agreed role-scoped authority and cannot cross private organization boundaries.

- **Unit Test Evidence:** `TargetRoleServiceTest.listsRolesFilteredByAssignedExpert`, `TargetRoleControllerTest.createTargetRoleReturns201`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (Neo4j Cypher filter on `assignedExpertId`)