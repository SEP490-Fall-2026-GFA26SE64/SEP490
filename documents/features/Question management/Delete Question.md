# Delete Question

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