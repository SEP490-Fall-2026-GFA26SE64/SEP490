# Create Question

**Function ID:** REQ-014-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Management](README.md)

## Description

Create an assessment question and its scoring information in authorized scope. Skill linking is a separate Question Mapping function.

**Input:** Question content, response format, scoring definition, and difficulty for baseline questions.  
**Outcome:** A question record available for authorized mapping and assessment configuration.

## Confirmed Related Rules

- From [Complete Baseline Assessment](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md), 2026-09-27: Questions used in baseline assessments are single-answer multiple-choice, with exactly one correct option and a difficulty label of Easy, Medium, or Hard. These labels support adaptive selection based on the preceding answer's result.
- These baseline constraints do not finalize question types or difficulty requirements for module and soft-skill assessments.
- From [Configure Baseline Assessment](../Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), 2026-09-27, option B: Complete, active questions with valid required fields and skill mappings are eligible for baseline coverage and delivery without a separate publishing step. Creating a question alone does not establish eligibility if required mapping or validation is incomplete.

## Open Decisions

- Supported types for module and soft-skill assessments.
- Additional required fields, correct answers/rubrics, difficulty criteria and requirements outside the baseline, and explanation text.
- Question reuse, module association, initial active status, and exact validation before use. Baseline eligibility requires no separate publishing step; publication policies for other assessment types remain open.

## Acceptance Baseline

A stored question retains the scoring information required by its configured response format.

- A question made eligible for baseline use must be single-answer multiple-choice, have exactly one correct option, and have an Easy, Medium, or Hard difficulty label.
- A complete, active baseline question becomes eligible when its required fields and mappings are valid, without a publish action. Incomplete, inactive, or invalidly mapped questions do not count toward baseline coverage or enter the eligible delivery pool.