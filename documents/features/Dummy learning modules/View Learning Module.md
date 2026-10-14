# View Learning Module

## Current Scope Alignment
Employee accesses approved module/course content through a confirmed pathway or independent skill learning, including mapped outcomes and assessments. Dummy-only content is superseded. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Dummy-Only Specification
Conflicting constraints below are superseded; delivery/completion policy remains open.

**Function ID:** REQ-007-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Dummy Learning Modules](README.md)

## Description

Display a recommended dummy module's description, intended outcome skills, and associated assessment. Real educational content and streaming are outside scope.

**Input:** An authorized recommended module.  
**Outcome:** Module details and access to its assessment when permitted.

## Confirmed Related Rule

- Existing-pathway decision, 2026-09-27, option A: Employees may continue viewing modules and accessing eligible module assessments in an existing active pathway after the selected role loses baseline readiness. Baseline readiness loss alone is not a module-access blocker. Module authorization and availability checks still apply; this does not restore removed modules or reactivate archived pathways.

## Open Decisions

- Required metadata such as difficulty, estimated duration, and prerequisite skills.
- Whether external resource links are supported.
- Whether viewing is tracked separately from assessment completion and how removed modules appear.

## Acceptance Baseline

An employee can understand the module's intended outcomes and locate its assessment without being required to consume real course content.

- An otherwise available, authorized module in an active pathway remains accessible when the role's baseline question coverage becomes insufficient. Its assessment remains accessible only when the assessment's own checks pass.