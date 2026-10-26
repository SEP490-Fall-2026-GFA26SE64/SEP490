# Define Module Outcome Skills

## Current Scope Alignment

**Ontology 0.9.0:** TEACHES is many-to-many. An authorized Expert can map a Module to several MicroSkills and map each skill to several Modules. Within one snapshot a Module–Skill pair is unique. Current import/publishable dataset requires at least one taught skill per Module and one teaching Module per skill; drafts/removal workflows must not silently publish orphan records.

Input: authorized Module and selected skill IDs. Outcome: versioned teaching mappings subject to L&D approval and content/evidence review. Recommendation considers the intersection with learner gaps; assessment evidence remains attributable to the assessed skills, not all mapped skills automatically. Replacing/removing mappings must preserve historical attempts and pathways in their original catalog context. Approval, concurrent writes and migration of active pathways remain implementation decisions.

Follow the [feature contract](README.md) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-016-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Module Outcomes](README.md)

## Description

Define the micro-skills that an authorized module is intended to teach, allowing the recommendation engine to match modules to gaps.

**Input:** Module and intended outcome skills.  
**Outcome:** Module-to-skill teaching relationships.

## Open Decisions

- Expected proficiency gain per skill remains open; multiple taught skills and multiple Module providers per skill are confirmed.
- Required coverage by assessment questions.
- Minimum outcome count and validation before a module becomes recommendable.

## Acceptance Baseline

Intended outcomes are available to gap-based module selection but do not themselves prove employee mastery.

## Confirmed teaching cardinality — 2026-10-26

User approved many-to-many TEACHES. Inputs are one Module and a non-empty set of existing MicroSkill IDs; one skill may belong to several Modules. Preserve every architecture-defined node/edge field and review state; reject duplicate pairs, wrong endpoints and loss of required teaching coverage. Suitable providers are selected for gaps and role/Level context; do not require all alternatives or infer mastery from a Module completion. No learner evidence, historical pins or assessment item content is rewritten by this catalog change. Publication/authorization/version transition policy remains open. See [test evidence and manual checks](../../testing/system/REQ-016-many-to-many-teaching.md).
