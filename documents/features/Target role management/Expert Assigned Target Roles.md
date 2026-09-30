# Expert Assigned Target Roles & Micro-skill Authoring

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
  - Within each role lineage (grouped by `stableId` / role code), the published version appears first, and any draft / sent / rejected successor version **always appears immediately below** its previous published version (e.g. `ROLE-AI-ARCH v1.1 DRAFT/SENT` is positioned directly below `ROLE-AI-ARCH v1.0 PUBLISHED`).
- **Status Lifecycle & Rejection Workflow**:
  - `DRAFT`: Initial draft created by L&D Manager.
  - `SENT`: Dispatched by L&D Manager to the assigned Domain Expert (`handleSendToExpert`), appearing in Manager workspace as "Sent" and in Expert workspace as "Draft" (not "Action Required").
  - `REJECTED`: Domain Expert can reject the target role. Status transitions to `REJECTED` and returns to the L&D Manager for adjustment and re-dispatch.
  - `PUBLISHED`: Domain Expert publishes the role to the knowledge graph once &ge; 1 micro-skill target is configured.
- **Micro-skill Authoring**:
  - Minimum 1 micro-skill target required for graph publication readiness.
  - Required proficiency threshold bounded within 1% to 100% (stored as `targetMastery: Float [0, 1]` on `[:REQUIRES_SKILL]` in Neo4j).
- **Publication Readiness**: Once the domain expert has completed micro-skill threshold mapping, the target role can be published into the active enterprise knowledge graph.

## Acceptance Baseline

The Domain Expert workspace fetches target roles assigned exclusively to their user persona directly from `/api/v1/organizations/{organizationId}/target-roles?assignedExpertId={expertId}` without containing any frontend mock data. Publishing transitions the target role to `ACTIVE` (displayed as `published`), and rejections transition to `REJECTED`, persisting immediately to the database so page reloads reflect the persisted status.

- **Unit Test Evidence:** `TargetRoleControllerTest.listTargetRolesReturns200`, `TargetRoleControllerTest.updateTargetRoleReturns200ForAssignedExpert`, `TargetRoleControllerTest.updateTargetRoleReturns403ForUnassignedExpert`, `TargetRoleServiceTest.filtersRolesByExpert`, `PostgresTargetRoleRepositoryTest.findByOrganizationIdMapsRows`, `PostgresTargetRoleRepositoryTest.saveUpdatesExistingRole`
- **Flyway Migration Evidence:** `V7__target_roles_baseline.sql` (Populates baseline roles into PostgreSQL `platform.target_role`)
