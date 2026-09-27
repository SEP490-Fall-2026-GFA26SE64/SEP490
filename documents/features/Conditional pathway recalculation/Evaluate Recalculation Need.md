# Evaluate Recalculation Need

**Function ID:** REQ-043-F01  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Conditional Pathway Recalculation](README.md)

## Description

After failed questions, map the evidence to micro-skills, calculate relevant gaps, and decide whether the existing pathway needs revision. Failure alone is insufficient to trigger a change.

**Input:** Failed-question evidence, updated competency state, prerequisites, and current pathway.  
**Outcome:** A recalculate/retain decision with its rationale.

## Open Decisions

- Exact gap thresholds, confidence requirements, and prerequisite diagnosis rules.
- What counts as a gap already covered by the remaining pathway.
- Repeated failures, event batching, and interactions with expert inclusions/exclusions.

## Acceptance Baseline

A submission with no failed questions does not cause failure-driven replanning; failed questions whose gaps do not require pathway changes leave the pathway unchanged.