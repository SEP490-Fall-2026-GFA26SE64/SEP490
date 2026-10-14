# Edit Prerequisite Relationships

## Current Scope Alignment
Expert maintains prerequisites in authorized assigned subject-matter scope for recommendations/tracing/gaps; validation/history/versioning remain open. L&D retains role publication, not graph authoring. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-018-F02  
**Actor:** Domain Expert, L&D Manager  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-018](../../testing/unit/REQ-018-target-role-graph-editing.md), [integration/REQ-018](../../testing/integration/REQ-018-target-role-graph-editing.md), [system/REQ-018](../../testing/system/REQ-018-target-role-graph-editing.md)  
**Feature:** [Target-Role Graph Editing](README.md)

## Description

Create, inspect, or remove authorized micro-skill prerequisite relationships (`PREREQUISITE_OF`) used in pathway generation and mastery gating.

**Input:** Source micro-skill ID, target micro-skill ID, and minimum mastery threshold (`minMastery`).  
**Outcome:** An updated directed acyclic prerequisite relationship persisted in Neo4j.

## Confirmed Rules

- **Schema Fidelity:** Relationship type `PREREQUISITE_OF` stores:
  - `minMastery`: Float between `0.0` and `1.0` (default: `0.70`).
  - `status`: String (`ACTIVE`).
- **Anti-Cycle Invariant (DAG):** Micro-skill prerequisite relationships form a strict Directed Acyclic Graph (DAG). Neo4j Cypher path query `MATCH path = (target)-[:PREREQUISITE_OF*1..25]->(source)` evaluates whether the proposed dependency would induce a cycle. If a cycle is detected, creation is rejected with `PrerequisiteCycleException` (HTTP `400 Bad Request`).
- **Self-Loop Invariant:** `sourceSkillId != targetSkillId`. Attempting to link a skill to itself throws `400 Bad Request`.
- **Endpoints:**
  - `GET /api/v1/organizations/{organizationId}/prerequisites`
  - `POST /api/v1/organizations/{organizationId}/prerequisites` (Body: `{sourceSkillId, targetSkillId, minMastery, status}`)
  - `DELETE /api/v1/organizations/{organizationId}/prerequisites?sourceSkillId=...&targetSkillId=...`
- **Security RBAC:** Domain Expert and L&D Manager authorized.

## Acceptance Baseline

The resulting dependency direction is unambiguous, acyclic, and strictly modeled according to `documents/ARCHITECTURE.md` and `documents/neo4j_schema.md`.