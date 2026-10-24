# Update Question

## Current Scope Alignment
Expert creates a new version when changing question content, response/correct-answer definition, difficulty or mapping in authorized scope. Adaptive baseline attempts retain pinned item/parameter versions and are never silently rescored. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

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

- Current REQ-002 contract: every attempt pins the exact item version and IRT parameter set. Editing/deactivating/recalibrating later affects only new attempts; it cannot change an already presented/unseen pinned item or rescore a finalized result.

- Current adaptive contract: new attempts use current active, complete, validly mapped question versions with parameter coverage. An in-progress attempt retains its pinned eligible versions and every presented item's text/options/key/mapping/parameters; later edits or deactivation affect only new attempts and never rescore finalized results.

## Open Decisions

- Remaining editable-field restrictions and validation after use. Baseline attempts retain the five specified starting fields despite later edits.
- Question-version retention and explicit invalidation or correction workflows. Baseline edits do not automatically rescore existing attempts; policies for other assessment types remain open.
- In-progress behavior for module and soft-skill assessments, and change approval requirements.

## Acceptance Baseline

Previously submitted answers must not become uninterpretable because their original question or scoring information was overwritten.

- An updated question eligible for new baseline attempts satisfies response-format, one-skill mapping and parameter-coverage requirements. An existing attempt uses its pinned text, options, correct answer, difficulty, mapping and `a/b/c` set. Display, scoring, selection and evidence attribution do not switch on resume.
- Deactivating a question excludes it from new baseline starting pools but leaves it available to attempts whose starting pools already contain it. Those attempts are not paused and their answers are not discarded solely because of deactivation.
