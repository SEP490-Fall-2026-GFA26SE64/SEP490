# RIASEC Assessment

**Requirement:** REQ-047  
**Actor:** Employee  
**Status:** Scope draft; detailed assessment policy pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-047-F01: Complete RIASEC Assessment

**Description:** Complete the configured interest assessment used with baseline evidence for AI-assisted target-role guidance.
**Input:** Authorized Employee and configured RIASEC items/responses.
**Outcome:** Recorded responses and interest results available to authorized guidance generation/review. These are not knowledge-mastery scores.

**Acceptance:** Given an eligible Employee and configured assessment, submitting valid responses records a result usable by [target role guidance](../Target%20role%20guidance/README.md). An Employee cannot access another Employee's responses. Old soft-skill responses are not converted to RIASEC results by renaming them.

**Open decisions:** Instrument/licensing, item format, scoring/normalization, attempt/resume rules, configuration ownership, result versioning and retention. No questionnaire or scoring formula is selected here.

**Entities/design gaps:** Assessment items, responses, interest result and version; storage mapping is not yet agreed. See [architecture](../../ARCHITECTURE.md).