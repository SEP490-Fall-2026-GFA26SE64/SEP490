# Knowledge Tracing

**Requirement:** REQ-059  
**Performer:** System  
**Status:** Baseline handoff direction confirmed; later-learning BKT parameters remain pending
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-059-F01: Update Estimated Skill Mastery

**Description:** Initialize a skill estimate from finalized adaptive-baseline theta/SE/mastery evidence, then update it from later learning evidence using the agreed BKT policy. This is an estimate, not proof of workplace competency.
**Input:** Exactly-once versioned baseline skill evidence or later mapped learning evidence, prior estimate where applicable, and agreed model/settings.
**Outcome:** Updated estimate with evidence provenance for competency profiling/gaps and any subsequent remaining-pathway evaluation.
**Acceptance:** Finalized baseline evidence initializes the skill state once; its underlying answers are not replayed as separate BKT observations. Later module/independent-learning evidence may update that state under BKT. Merely viewing content cannot increase mastery, and duplicate processing cannot create conflicting updates. RIASEC interests are not knowledge evidence.

**Open decisions:** BKT learn/guess/slip/forget parameters, decay, confidence propagation, thresholds, evidence reuse, replay and model-version policy. Baseline IRT parameters are not reused as BKT parameters.
**Entities/design gaps:** Assessment evidence, competency estimate/model version and processing history. See [consistent learning state](../Consistent%20learning%20state/README.md) and [gap analysis](../Competency%20profiling%20and%20gap%20analysis/README.md).
