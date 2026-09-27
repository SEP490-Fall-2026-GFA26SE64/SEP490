# Review AI Soft-Skill Comments

**Function ID:** REQ-021-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [AI Soft-Skill Review](README.md)

## Description

Inspect AI-generated comments about an authorized employee's soft-skill assessment and its relationship to the selected target role.

**Input:** Soft-skill evidence, target-role expectations, and generated comments.  
**Outcome:** Expert review; approval, editing, and publication actions are not yet confirmed.

## Confirmed Related Rule

- From the soft-skill interview, 2026-09-27, option B: Before expert review is complete, employees see only the summarized result, not the raw AI-generated comment text. The system must clearly label it as AI-generated and pending expert review. Experts can still access the raw AI comment and the underlying soft-skill evidence for review. This does not change whether the expert may approve, edit, or replace the comment, nor whether the reviewed result influences pathway generation.

## Open Decisions

- Read-only review versus approve/reject/edit, and whether experts add their own comments.
- Required evidence visibility, review assignment, and handling AI errors.
- Who sees original versus reviewed comments and whether the review influences pathways.

## Acceptance Baseline

The expert can distinguish AI-generated commentary from assessment evidence and any eventual human review outcome.

- Before expert review is complete, employees see only a summarized soft-skill result, clearly labeled as AI-generated and pending expert review. Raw comment text remains visible only to authorized experts and administrators.