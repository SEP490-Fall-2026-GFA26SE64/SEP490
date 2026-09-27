# Delete Micro-Skill

**Function ID:** REQ-012-F04  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Micro-Skill Management](README.md)

## Description

Remove a micro-skill from use within authorized scope without breaking recorded assessments or graph references.

**Input:** Selected micro-skill and deletion request.  
**Outcome:** Deletion, archival, or a blocked request according to the policy to be agreed.

## Open Decisions

- Hard deletion for unused skills versus archival for referenced skills.
- Dependency checks, confirmation, and required replacement mappings.
- Restore support and the effect on active roles/pathways.

## Acceptance Baseline

A deletion cannot silently leave invalid role, module, question, or historical evidence references.