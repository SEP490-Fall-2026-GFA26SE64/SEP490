# Update Learning Module

## Current Scope Alignment
Expert updates/organizes an assigned-discipline module and submits revisions for L&D approval; version effects on learning remain open. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-013-F03  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Learning Module Management](README.md)

## Description

Update an authorized dummy module's descriptive information while preserving references from pathways and assessment history.

**Input:** Existing module and changed attributes.  
**Outcome:** Updated module metadata under the agreed version policy.

## Open Decisions

- Editable fields and whether active modules require a new version.
- Handling modules with assessments already in progress.
- Concurrent edits and when changes become visible to employees.

## Acceptance Baseline

Updating metadata does not erase prior assessment evidence or silently grant employees module-selection control.

## Duration and paid-module estimate correction — 2026-10-27

REQ-013-F01/F03 and REQ-016-F01/F02: LearningModule.duration is expected total learner effort (reading, practice, integration, reflection), in positive integer minutes. LearningModule.price is the positive VND price for the complete module learning package, charged once per selected Module, not per skill. Seed estimates vary by mapped skill effort and task depth; they are not vendor quotes or runtime pricing rules. The 85 paid sample Modules span 150–915 minutes and 150,000–1,560,000 VND. See [method and assumptions](../../dataset/MODULE_EFFORT_PRICE.md). Cost comparisons must deduplicate Modules covering multiple gaps. OC calculation remains deferred. Runtime CRUD/publication/migration is not implemented by this dataset correction.
