# Unlink Question from Micro-Skill

**Function ID:** REQ-017-F02  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Mapping](README.md)

## Description

Remove an authorized question-to-skill relationship while preserving the mappings applicable to historical attempts.

**Input:** Existing question-to-skill link.  
**Outcome:** A removed mapping or a blocked request under the agreed validity rules.

## Open Decisions

- Whether a question can remain published without any skill mapping.
- Treatment of active assessments and required replacement links.
- Historical mapping retention and scoring consequences.

## Acceptance Baseline

Unlinking a skill does not erase or silently change the evidence already recorded for past answers.