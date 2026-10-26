# View Learning Module

## Current Scope Alignment
Employee accesses approved Module content through a confirmed pathway or independent skill learning, including mapped outcomes and assessments. Dummy-only content is superseded. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

The current Module view must show the mapped skills. A Module may cover several skills, and other Modules may teach the same skills. Availability and assessment evidence are evaluated independently of the number of mappings.


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

- Current adaptive-baseline dependency: later Blueprint replacement, disablement or catalog staleness is not a module-access rule and does not erase completed mastery. Module/pathway authorization and availability remain authoritative.

## Open Decisions

- Required metadata such as difficulty, estimated duration, and prerequisite skills.
- Whether external resource links are supported.
- Whether viewing is tracked separately from assessment completion and how removed modules appear.

## Acceptance Baseline

An employee can understand the module's intended outcomes and locate its assessment without being required to consume real course content.

- An otherwise available, authorized module remains accessible after a later Blueprint/catalog change. Its assessment remains accessible only when the assessment's own checks pass.
