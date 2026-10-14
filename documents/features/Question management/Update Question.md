# Update Question

## Current Scope Alignment
Expert updates module assessment questions/scoring/mappings within assigned disciplines and submits revised assessment offerings for approval. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-014-F03  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Management](README.md)

## Description

Update an authorized question or scoring definition while preserving the interpretation of existing assessment attempts.

**Input:** Question and edited content/scoring.  
**Outcome:** An updated question or new question version under the chosen policy.

## Confirmed Related Rule

- From [Complete Baseline Assessment](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md), 2026-09-27: A question eligible for baseline use must remain single-answer multiple-choice with exactly one correct option and an Easy, Medium, or Hard difficulty label. An existing baseline attempt keeps its starting difficulty label even if the question is edited later.

- From [Configure Baseline Assessment](../Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), 2026-09-27: Option B requires complete, active questions with valid required fields and skill mappings for current baseline coverage and new starting pools, without separate publishing. The subsequent option A preserves an in-progress baseline attempt's starting pool despite later deactivation, including on resume.
- Option A, 2026-09-27: Each baseline attempt keeps the starting text, options, correct answer, difficulty, and skill mapping for every question in its pool, including unseen questions and after resume. Edits apply to new attempts subject to eligibility and coverage checks; saving an edit does not automatically rescore existing attempts. This does not settle versioning policies for other assessment types.

## Open Decisions

- Remaining editable-field restrictions and validation after use. Baseline attempts retain the five specified starting fields despite later edits.
- Question-version retention and explicit invalidation or correction workflows. Baseline edits do not automatically rescore existing attempts; policies for other assessment types remain open.
- In-progress behavior for module and soft-skill assessments, and change approval requirements.

## Acceptance Baseline

Previously submitted answers must not become uninterpretable because their original question or scoring information was overwritten.

- An updated question eligible for new baseline attempts satisfies the baseline response-format and difficulty requirements. An existing attempt uses its starting text, options, correct answer, difficulty, and skill mapping even if that question has not yet been shown. Display, scoring, selection, and evidence attribution do not switch to the edited version on resume.
- Deactivating a question excludes it from new baseline starting pools but leaves it available to attempts whose starting pools already contain it. Those attempts are not paused and their answers are not discarded solely because of deactivation.