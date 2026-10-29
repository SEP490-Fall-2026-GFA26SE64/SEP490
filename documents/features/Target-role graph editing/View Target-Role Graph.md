# View Target-Role Graph

## Current Scope Alignment
Expert views authorized assigned-role requirements/prerequisites and discipline content relationships. Employee personal graph and L&D publication review are separate access contexts. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-018-F01  
**Actor:** Domain Expert, L&D Manager  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-018](../../testing/unit/REQ-018-target-role-graph-editing.md), [integration/REQ-018](../../testing/integration/REQ-018-target-role-graph-editing.md), [system/REQ-018](../../testing/system/REQ-018-target-role-graph-editing.md)  
**Feature:** [Target-Role Graph Editing](README.md)

## Description

Display the assigned role's knowledge graph for inspection, prerequisite analysis, and navigation to permitted editing functions.

**Input:** Organization ID and Target Role ID.  
**Outcome:** An authorized graph view of role requirements (`REQUIRES_SKILL`) and learning prerequisite relationships (`PREREQUISITE_OF`).

## Confirmed Rules

- **Authorized Scope:** Returns the target role subgraph containing:
  - Role node: `id`, `code`, `title`, `track`, `seniority`, `status`.
  - Seniority Level nodes: `id`, `code`, `rank`, `title`.
  - Competency group nodes: `id` (auto-generated UUID), `code` (e.g. `COMP-DEV-J01`), `name`, `status`, `attainmentRule`.
  - Required micro-skills: `id`, `code`, `name`, `macroCompetencyCode`, `targetMastery`.
  - Internal prerequisite dependencies: `sourceSkillId`, `sourceSkillCode`, `targetSkillId`, `targetSkillCode`, `minMastery`, `status`.
- **Visualization:** Interactive vis-network canvas with dual layout modes (Hierarchical top-down and Organic force-directed), zoom/pan, and Element Inspector drawer.
- **REST Endpoint:** `GET /api/v1/organizations/{organizationId}/target-roles/{roleId}/graph`
- **Security RBAC:** Allowed for `DOMAIN_EXPERT` and `LD_MANAGER`; `403 Forbidden` for `LEARNER`.

## Acceptance Baseline

The expert and manager can inspect assigned role relationships with 100% architectural schema compliance.