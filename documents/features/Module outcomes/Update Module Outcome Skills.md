# Update Module Outcome Skills

## Current Scope Alignment

**Ontology 0.9.0:** TEACHES is many-to-many. An authorized Expert can map a Module to several MicroSkills and map each skill to several Modules. Within one snapshot a Module–Skill pair is unique. Current import/publishable dataset requires at least one taught skill per Module and one teaching Module per skill; drafts/removal workflows must not silently publish orphan records.

Input: authorized Module and selected skill IDs. Outcome: versioned teaching mappings subject to L&D approval and content/evidence review. Recommendation considers the intersection with learner gaps; assessment evidence remains attributable to the assessed skills, not all mapped skills automatically. Replacing/removing mappings must preserve historical attempts and pathways in their original catalog context. Approval, concurrent writes and migration of active pathways remain implementation decisions.

Follow the [feature contract](README.md) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-016-F02  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Module Outcomes](README.md)

## Description

Modify an authorized module's outcome mappings, including adding, changing, or removing intended skills.

**Input:** Existing outcome mappings and requested changes.  
**Outcome:** Updated teaching relationships under the agreed version policy.

## Open Decisions

- Removal constraints and checks against associated assessment coverage.
- Effect on existing pathways and previously assessed module attempts.
- Publication, concurrent edits, and historical mapping retention.

## Acceptance Baseline

An outcome update does not silently reinterpret the skill evidence from a previous assessment attempt.