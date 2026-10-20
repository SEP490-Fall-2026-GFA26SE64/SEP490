# View Assessment Result

## Current Scope Alignment
Employee views own baseline, RIASEC and module results, distinguishing interest scores from competency estimates. For an adaptive baseline result, show derived raw score, conservative per-MicroSkill mastery and a plain-language confidence label. Retain theta/SE and pinned provenance for authorized processing/audit but hide theta, SE, protected answers and rationales from the Employee. An invalidated attempt has no mastery result and links to its permitted replacement. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-009-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Assessment Results](README.md)

## Description

Display an employee's own baseline, soft-skill, or module assessment outcome, including skill-level results where the scoring method supports them.

**Input:** Employee and owned assessment attempt.  
**Outcome:** Authorized result details without modifying the recorded attempt.

## Open Decisions

- RIASEC/module result details and AI comment visibility; adaptive baseline disclosure is fixed by REQ-002.
- Immediate publication versus delayed/expert-reviewed publication for each assessment type.
- Pending scoring, invalid questions, and unavailable results.

## Acceptance Baseline

An employee can inspect an available own result but cannot access another employee's result by changing an identifier.
