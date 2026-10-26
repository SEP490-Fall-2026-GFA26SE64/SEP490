# Complete Module Assessment

## Current Scope Alignment
Employee completes approved Expert-configured module assessments for pathway or independent learning. Record mapped evidence for tracing/progress and evaluate learning needs under new evidence, not solely failures. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-008-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Module Assessment](README.md)

## Description

Submit answers to the assessment associated with a recommended module. Retain question-level outcomes and micro-skill mappings for result presentation and gap evaluation.

**Input:** Assigned module, eligible attempt, questions, and answers.  
**Outcome:** A scored attempt supplied to competency updating and, when questions fail, recalculation evaluation.

## Confirmed Related Rule

- Current adaptive-baseline dependency: later Blueprint replacement, disablement or catalog staleness does not by itself block a module assessment. Apply the module assessment's own authorization, availability and eligibility checks; this does not change its retake/scoring rules or permit archived-pathway access.

## Open Decisions

- Question types, selection, count, timers, and submission behavior.
- Module pass rules versus question-level failure rules, retakes, and retry cooldowns.
- Assessment eligibility, interruption recovery, and feedback released after submission.

## Acceptance Baseline

A failed question can be traced to the assessed micro-skill; failure alone does not unconditionally replan the pathway.

- Given an otherwise eligible module assessment, a later adaptive-Blueprint/catalog change does not by itself block starting or continuing it. A separate module-assessment eligibility failure still blocks the operation.
