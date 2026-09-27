# Update Micro-Skill

**Function ID:** REQ-012-F03  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Micro-Skill Management](README.md)

## Description

Change an existing authorized micro-skill's attributes while respecting its relationships and historical references.

**Input:** Micro-skill and edited attributes.  
**Outcome:** Updated skill metadata under the selected change policy.

## Open Decisions

- Editable fields and whether changes create a new version.
- Effect on active assessments, competency states, and pathways.
- Concurrent edit handling and approval requirements.

## Acceptance Baseline

Only an authorized expert can update the skill; historical assessment references must not become orphaned.