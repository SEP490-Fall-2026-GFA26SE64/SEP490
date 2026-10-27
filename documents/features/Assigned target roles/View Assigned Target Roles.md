# View Assigned Target Roles

## Current Scope Alignment
Expert views L&D-assigned roles for competency configuration and authorized reviews; discipline assignments separately govern content authoring. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

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
- **Read-Only Macro Metadata & View Detail Visibility**: Experts cannot edit role codes, titles, domains, tracks, or family metadata defined by L&D Managers; they are exclusively authorized to configure micro-skill targets and submit publication or rejection decisions. The dedicated "Target Role Details" modal is accessible via the **View Role Details** action button exclusively when a target role is in **PUBLISHED** or **REJECTED** status. When a role is in **SENT** (or **DRAFT**) status, the View Detail action is hidden, and the expert workspace focuses directly on micro-skill authoring and threshold configuration.
- **SENT Status Lifecycle Preservation**: When an L&D Manager dispatches a target role to a Domain Expert (`status = SENT`), the role strictly preserves its `SENT` status while the expert authors, adds, or removes micro-skill target benchmarks. The role remains in `SENT` status until the expert explicitly executes a **Publish** (`ACTIVE`) or **Reject** (`REJECTED`) action.
- **Display Ordering Rule**: In target role catalogs, any successor draft, sent, or rejected version is always ordered immediately below its previous published version within the same lineage (e.g., `v1.1 DRAFT/SENT` is positioned directly beneath `v1.0 PUBLISHED`).
- **Graph-to-Form Strict Level Alignment**: The competency knowledge graph strictly reflects the configured micro-skills and competencies per proficiency level. When filtering the graph by a level (e.g., `Intern`), the graph only renders micro-skills explicitly configured for that level, preventing skills from other tiers (e.g., `Fresher`) from showing under unassigned levels.
- **Successor Draft Visibility Isolation**: When a Domain Expert creates a new revision draft from a published target role (`status: 'draft'`), it is strictly private to the Expert Authoring portal and is hidden from L&D Manager and Admin catalogs/KPI cards until the expert explicitly submits it to L&D Manager (`status: 'submitted'`).
- **Single Active Revision Draft Constraint**: A target role lineage permits at most one active successor draft or submission in flight. The `+ New Draft` action is disabled while an active draft or submission exists. Once the L&D Manager publishes the successor version, the previous version is marked superseded in Neo4j, making the newly published version the active baseline from which future drafts may be created.
- **Immediate Inheritance & Competency Count**: Creating a successor draft immediately inherits all predecessor competencies, micro-skills, and levels, instantly reflecting the non-zero competency count in table catalogs without requiring a browser reload.

## Acceptance Baseline

An expert cannot use this workspace to view or manage a role outside their authorized assignments. Macro role architecture fields are strictly uneditable, and authoring actions do not alter the dispatched `SENT` state until publication or rejection.

- **Unit Test Evidence:** `TargetRoleServiceTest.listsRolesFilteredByAssignedExpert`, `TargetRoleControllerTest.getTargetRoleReturns403ForUnassignedExpert`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (Neo4j Cypher filtering on `assignedExpertId`, verified retention of `SENT` status upon micro-skill additions)
- **System Test Evidence:** `documents/testing/system/REQ-011-assigned-target-roles.md` (Domain Expert UI inspection, read-only Target Role Details modal verification, micro-skill authoring persistence)