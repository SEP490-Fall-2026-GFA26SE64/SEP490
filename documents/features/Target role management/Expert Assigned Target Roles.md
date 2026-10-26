# Expert Assigned Target Roles & Micro-skill Authoring

## Current Scope Alignment
Expert configures assigned-role competency/micro-skill requirements, proficiency and importance and submits completion to L&D. L&D reviews/publishes without editing requirements; discipline content authoring still needs separate assignment. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-023-F05  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Dedicated workspace for Domain Experts to view target roles assigned to their specialization by L&D Managers and author the required technical micro-skill benchmark thresholds (`targetMastery`) and prerequisite constraints.

**Input:** Assigned target roles for authenticated domain expert (`assignedExpertId = X-User-Id`), micro-skill catalog selections, and threshold percentages (1–100% mapping to `targetMastery: Float [0, 1]`).  
**Outcome:** Configured micro-skill requirement benchmarks linked to the draft target role, and role readiness for knowledge graph publication.

## Confirmed Rules

- **Data Isolation**: Domain Experts can **strictly only view** target roles where `assignedExpertId == authenticatedExpertId`. Unassigned target roles or roles assigned to other domain experts are completely hidden from query results.
- **Separation of Concerns & Field Edit Permissions (Re-verified)**:
  - **L&D Manager**: Exclusively defines macro title, job domain, career family, track archetype, description, and assigned domain expert.
   - **Domain Expert**: Strictly **cannot edit** macro fields (Code, Title, Domain, Family, Track, Assigned Expert, Description). Experts are strictly restricted to authoring micro-skill taxonomy targets (proficiency thresholds) and review decisions (Approve/Publish or Reject).
- **Draft Versioning & Display Order**:
  - Within each role lineage (grouped by `stableId` / role code), if multiple published versions exist, only the newest published version is shown as the primary row; older published versions are collapsed inside with a dropdown indicator. Previous versions cannot be used to create successor drafts (only the newest published version can create drafts). Any draft / sent / rejected successor version appears below its published version without any "under v1.0" badge.
- **Status Lifecycle & Bidirectional Approval Workflow (Aligned with Capstone Specification)**:
  - `DRAFT`: Initial draft created by L&D Manager or opened for configuration by the assigned Domain Expert. The expert authors micro-skill taxonomy targets and required benchmark thresholds.
  - `SUBMITTED`: Once at least 1 micro-skill threshold is configured, the Domain Expert submits the completed role configuration to the L&D Manager for confirmation. Status transitions to `SUBMITTED` in both Expert and Manager catalogs.
  - `REJECTED`: The L&D Manager can return the submitted configuration back to the Domain Expert with actionable revision feedback notes. The expert views the rejection feedback, modifies the micro-skill targets, and re-submits to the manager. Alternatively, an assigned expert can reject an out-of-scope role assignment.
  - `ACTIVE` (Displayed as `PUBLISHED`): The L&D Manager approves and publishes the submitted role configuration to the active enterprise knowledge graph, making it available for employee career pathway discovery.
- **Micro-skill Authoring & Submission Readiness**:
  - Minimum 1 micro-skill target required before submission to L&D Manager.
  - Required proficiency threshold bounded within 1% to 100% (stored as `targetMastery: Float [0, 1]` on `[:REQUIRES_SKILL]` in Neo4j).
- **Publication Authority**: Per Capstone functional specification, final publication authority belongs to the L&D Manager upon review of the Domain Expert's submitted competency configuration.

## Acceptance Baseline

The Domain Expert workspace fetches target roles assigned exclusively to their user persona directly from `/api/v1/organizations/{organizationId}/target-roles?assignedExpertId={expertId}` without containing any frontend mock data. Publishing transitions the target role to `ACTIVE` (displayed as `published`), and rejections transition to `REJECTED`, persisting immediately to the database so page reloads reflect the persisted status.

- **Unit Test Evidence:** `TargetRoleControllerTest.listTargetRolesReturns200`, `TargetRoleControllerTest.updateTargetRoleReturns200ForAssignedExpert`, `TargetRoleControllerTest.updateTargetRoleReturns403ForUnassignedExpert`, `TargetRoleServiceTest.filtersRolesByExpert`, `PostgresTargetRoleRepositoryTest.findByOrganizationIdMapsRows`, `PostgresTargetRoleRepositoryTest.saveUpdatesExistingRole`
- **Flyway Migration Evidence:** `V7__target_roles_baseline.sql` (Populates baseline roles into PostgreSQL `platform.target_role`)
