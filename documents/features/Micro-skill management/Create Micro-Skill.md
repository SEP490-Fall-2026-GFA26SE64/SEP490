# Create Micro-Skill

## Current Scope Alignment
Expert creates micro-skills within assigned disciplines, with descriptions and proficiency representation under an agreed schema. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-012-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-012](../../testing/unit/REQ-012-micro-skill-management.md), [integration/REQ-012](../../testing/integration/REQ-012-micro-skill-management.md), [system/REQ-012](../../testing/system/REQ-012-micro-skill-management.md)  
**Feature:** [Micro-Skill Management](README.md)

## Description

Create a granular skill within the expert's authorized knowledge scope for later role, module, question, and prerequisite mapping. Domain Experts create micro-skills and will subsequently link them to Target Roles (REQ-015 in Sprint 3) and prerequisite graphs (REQ-018 in Sprint 4).

**Input:** Skill name, code, description, associated macro-competency (`KNOWLEDGE`, `COMMUNICATION`, `INNOVATION`), and organization context (`organizationId`).  
**Outcome:** A new `MicroSkill` node in Neo4j with status `ACTIVE`, isolated by `organizationId`, and linked to its parent `MacroCompetency`.

## Confirmed Related Rules

- **Actor Role**: Domain Expert (`DOMAIN_EXPERT` / `EXPERT`).
- **Tenant Scope**: Strict isolation by `organizationId`.
- **Competency Grouping**: Every created micro-skill connects to a predefined `MacroCompetency` (`KNOWLEDGE`, `COMMUNICATION`, `INNOVATION`) via `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)`.
- **Role Decoupling**: Creation does not automatically link the micro-skill to any target role. The Domain Expert explicitly associates micro-skills with target roles in REQ-015 (Sprint 3).
- **Uniqueness**: Micro-skill code must be unique within the organization. Duplicates return `409 Conflict`.

## Acceptance Baseline

Creation does not grant the expert rights to unrelated organization data or automatically link the skill to every role.