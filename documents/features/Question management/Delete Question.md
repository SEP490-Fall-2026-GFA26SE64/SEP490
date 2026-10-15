# Delete Question

## Current Scope Alignment
Expert removes/deactivates questions within assigned assessment scope under an agreed history/approval policy; do not erase evidence or pinned attempts. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-014-F04  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Management](README.md)

## Description

Remove a question from use without breaking assessment evidence or minimum question coverage requirements.

**Input:** Authorized question and deletion request.  
**Outcome:** Deleted/archived question or a rejected request under the agreed dependency policy.

## Open Decisions

- Hard deletion of unused items versus archival of used items.
- Active-assessment checks and replacement-question requirements.
- Retention of answer keys and question text for historical results.

## Acceptance Baseline

Removing a question does not silently remove already-recorded answers or their skill mappings.