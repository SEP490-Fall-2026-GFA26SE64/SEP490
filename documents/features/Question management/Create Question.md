# Create Question

## Current Scope Alignment
Expert creates versioned questions in assigned scope, including response schema, protected correct answer and authoring difficulty. Baseline use additionally requires one MicroSkill mapping and an eligible versioned IRT `a/b/c` tuple; it does not use author-entered point weights. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-014-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Management](README.md)

## Description

Create an assessment question and its response/correct-answer definition in authorized scope. Skill linking and IRT calibration/version promotion are separate concerns.

**Input:** Question content, response format, protected correct answer, and authoring difficulty.
**Outcome:** A question record available for authorized mapping and assessment configuration.

## Confirmed Related Rules

- Current REQ-002 contract: a baseline item is single-answer multiple-choice, has exactly one correct option, one assessed MicroSkill and a difficulty label for authoring/cold start. Adaptive selection uses the pinned 3PL parameter version and item information, not a fixed previous-answer difficulty ladder.
- L&D does not enter item points. An eligible baseline item needs a versioned `a > 0`, real `b`, and `0 <= c < 1`; calibration ownership/promotion is outside question creation.
- These baseline constraints do not finalize question types or difficulty requirements for module and soft-skill assessments.
- Current adaptive contract: only active, complete question versions with valid assessed-skill mapping and pinned IRT parameter coverage enter a new Blueprint/attempt pool. Creating a question alone does not establish eligibility.

## Open Decisions

- Supported types for module and soft-skill assessments.
- Additional required fields, correct answers/rubrics, difficulty criteria and requirements outside the baseline, and explanation text.
- Question reuse, module association, initial active status, and exact validation before use. Baseline eligibility requires no separate publishing step; publication policies for other assessment types remain open.

## Acceptance Baseline

A stored question retains the response/correct-answer information required to score its configured response format reproducibly.

- A question made eligible for baseline use must be single-answer multiple-choice, have exactly one correct option, and have an Easy, Medium, or Hard difficulty label.
- A baseline question enters the eligible delivery pool only when its required fields, one-skill mapping, status and pinned IRT parameter coverage satisfy the current Blueprint contract. Exact question-authoring activation terminology remains owned by this Function.
