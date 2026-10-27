# Create Learning Module

## Current Scope Alignment
Expert creates a module in an assigned discipline and submits it to L&D for approval before organizational use; no dummy-only restriction. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-013-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Learning Module Management](README.md)  
**Schema Compliance:** Neo4j Ontology v0.8.0 (`LearningModule` node, 1–1 `TEACHES` relationship to `MicroSkill`)

## Description

Domain Experts author structured learning content packages in the **Learning Content Studio** (`/expert/learning-content`) with reading sections, code snippets, and video lectures. The content package is submitted to the **L&D Manager Approval Queue** (`/ld-manager/approvals`). Once approved, the Expert binds the approved learning content into a `LearningModule` (`/expert/modules`) with strict schema properties:
- `moduleType`: `LESSON_AND_PRACTICE` | `RESOURCE_GUIDED_PRACTICE`
- `contentUri`: File/package reference (e.g., `content/modules/MOD-CYP-101.json`)
- `contentType`: `application/json` | `text/markdown`
- `contentVersion`: e.g., `1.0`, `2.0`
- `reviewStatus`: `NEEDS_EXPERT_REVIEW` | `APPROVED` | `REJECTED`
- `teachesSkillId`: Exactly one micro-skill via 1–1 `TEACHES` relationship.

Learners and reviewers can test-drive the full interactive course in the employee reader view at `/employee/modules/:moduleId`.

## Acceptance Baseline

1. A module strictly maps 1-to-1 with a taught `MicroSkill` via `TEACHES`.
2. Learning content must be submitted to and approved by an L&D Manager before organizational release.
3. Modules store valid schema properties and can be previewed in the interactive lesson reader.