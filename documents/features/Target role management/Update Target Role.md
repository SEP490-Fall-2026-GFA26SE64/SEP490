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

Update target-role metadata, O*NET occupation, Ontology Local Profile, customizable Calibration Level thresholds (J, M, S), and Domain Expert assignment. Changes to micro-skill requirements remain exclusively the responsibility of assigned Domain Experts.

**Input:** Organization target role ID and edited fields: Role Title (`title`), O*NET Occupation (`occupationCode`), Ontology Local Profile (`familyCode`), Customizable Calibration Thresholds (`levelThresholds: { J, M, S }`), Key Responsibilities (`responsibilities`), Assigned Domain Expert (`assignedExpertId`), and Role Scope (`scope` / `description`).  
**Outcome:** Updated role details in Neo4j and PostgreSQL.

## Confirmed Rules

- **L&D Manager Scope**: L&D Managers can edit the role attributes they govern (title, occupation, local profile, calibration thresholds, responsibilities, assigned expert, scope). They **cannot** add or edit individual micro-skill nodes (which is exclusively the Domain Expert's role).
- **Customizable Ontology Calibration Tiers (Levels J • M • S)**:
  - Benchmark passing thresholds for Junior (Rank 1), Middle (Rank 2), and Senior (Rank 3) can be customized per target role to match organization or role-specific rigor (e.g. elevating Senior to 95% for mission-critical roles).
- **O*NET Occupation & Local Profile Alignment (`ONTOLOGY.md`)**:
  - Roles strictly align with O*NET occupations and ontology profiles defined in `ONTOLOGY.md` (e.g., `DEV`, `INFRA`, `DATAENG`, `QAENG`, `SECANALYSIS`). Outdated fields (`track`, `seniority`, `domainCode`) are deprecated from the UI while maintained as default fallbacks in REST payloads.
- **Responsibilities Modification**: L&D Managers can add, reorder, or update the list of strings representing job responsibilities for the Job Description.
- **Assigned Expert Isolation & Occupation Eligibility**:
  - When an expert is assigned or changed, other experts lose visibility into this role. Only the assigned expert can view and configure the target role in their Expert Portal.
  - The Assigned Domain Expert combobox dynamically filters to only list experts certified and assigned for the role's O*NET occupation (`15-1252.00`, `15-1243.00`, etc.). If the occupation is changed during editing, the form automatically re-evaluates the assigned expert against the new occupation's certified roster.
- **Status Lifecycle Transitions**: Both L&D Managers and assigned Domain Experts can transition the status:
  - L&D Manager: transitions to `SENT` when dispatching to Domain Expert, or `ACTIVE` when publishing directly.
  - Domain Expert: transitions to `ACTIVE` (Published) or `REJECTED` for target roles assigned to their expert ID. Unassigned experts are rejected with `403 Forbidden`.

## Acceptance Baseline

Administrative metadata changes do not silently modify the role's skill requirements or erase existing role selections. Status updates persist directly to the database so that reloading preserves the updated status.

- **Unit Test Evidence:** `TargetRoleDomainTest.updateDetailsModifiesMetadata`, `TargetRoleServiceTest.updatesTargetRoleSuccessfully`, `TargetRoleControllerTest.updateTargetRoleReturns200`, `TargetRoleControllerTest.updateTargetRoleReturns403ForLearner`, `TargetRoleControllerTest.updateTargetRoleReturns200ForAssignedExpert`, `TargetRoleControllerTest.updateTargetRoleReturns403ForUnassignedExpert`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation`, `PostgresTargetRoleRepositoryTest.saveUpdatesExistingRole` (verifies `status` and metadata updates persist to PostgreSQL)

