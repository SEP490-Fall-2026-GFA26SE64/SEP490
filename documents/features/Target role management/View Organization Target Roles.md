# View Organization Target Roles

**Function ID:** REQ-023-F02  
**Actor:** L&D Manager  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Browse, filter, and inspect the organization's target-role catalog for L&D management. The L&D Manager can view all target roles created for their organization (including `DRAFT`, `SENT`, `REJECTED`, and `PUBLISHED`/`ACTIVE`), view metadata, track, and status, without possessing domain-expert micro-skill graph-editing permissions.

**Input:** Organization context (`organizationId`), optional search keyword, track filter (`PROFESSIONAL` / `MANAGEMENT`), status filter (`DRAFT`, `SENT`, `REJECTED`, `ACTIVE`), domain filter (`domainCode`), and assigned expert filter (`assignedExpertId`).  
**Outcome:** Scoped target-role list and details belonging strictly to the manager's organization.

## Confirmed Related Rules

- **Actor Role**: L&D Manager (`LD_MANAGER`).
- **Tenant Scope & Isolation**: Strict isolation by `organizationId`. A manager cannot see or manage target roles from other organizations.
- **Role Visibility**: L&D Managers can see their organization's `DRAFT`, `SENT`, `REJECTED`, and `PUBLISHED` roles to manage catalog configuration, whereas employee-facing browsing strictly filters out draft or baseline-unready roles.
- **Display Ordering Rule**: In target role catalogs, any successor draft, sent, or rejected version is always ordered immediately below its previous published version within the same lineage (e.g., `v1.1 DRAFT/SENT` is positioned directly beneath `v1.0 PUBLISHED`).
- **Snug Action Toolbar**: Action buttons in tables use icon-only triggers with accessible tooltips and clear visual hierarchy per UI-UX Pro Max standards.

## Acceptance Baseline

The L&D Manager can inspect own-organization roles with full tenant isolation and multi-criteria filtering without receiving expert micro-skill authoring permissions automatically.

- **Unit Test Evidence:** `TargetRoleServiceTest.listsRolesWithOrgIsolation`, `TargetRoleControllerTest.listTargetRolesReturns200`
- **Integration Test Evidence:** `TargetRoleAndMicroSkillNeo4jIntegrationTest.testNeo4jPersistenceAndIsolation` (Neo4j Testcontainers)