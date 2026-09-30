# Unlink Micro-Skill from Target Role

**Function ID:** REQ-015-F02  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Role Requirements](README.md)

## Description

Remove a micro-skill requirement from an assigned target role draft without deleting the underlying micro-skill node from the shared competency ontology.

**Input:** Authorized draft target role and configured micro-skill target ID.  
**Outcome:** The requirement edge `[:REQUIRES_SKILL]` is removed from the draft target role.

## Confirmed Related Rules

- **Shared Ontology Preservation**: Removing a skill requirement from a target role only deletes the requirement link to that specific target role. The underlying `MicroSkill` node and its relationships to competencies or other roles remain completely untouched.
- **Draft State Constraint**: Unlinking is performed in `DRAFT` status. To modify links on a published role, a successor draft must be created.
- **Icon-Only Snug Actions**: Unlink actions are triggered via icon buttons (`Trash2`) with clear tooltips to maintain modern table density per UI-UX Pro Max standards.

## Acceptance Baseline

Unlinking one role's requirement does not delete that skill or its relationships to other roles.

- **Acceptance Criteria**: Graph relationship deleted, micro-skill entity preserved.
- **Test Evidence**: Target role micro-skill authoring workspace and Neo4j graph constraint tests.