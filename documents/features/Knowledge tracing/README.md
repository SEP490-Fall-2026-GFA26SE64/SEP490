# Knowledge Tracing

**Requirement:** REQ-059  
**Performer:** System  
**Status:** Scope draft; model and parameters pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-059-F01: Update Estimated Skill Mastery

**Description:** Update competency estimates from recorded assessment evidence using configured rules. This is an estimate, not proof of workplace competency.
**Input:** Valid mapped assessment evidence, prior estimate where applicable, and agreed tracing model/settings.
**Outcome:** Updated estimate with evidence provenance for competency profiling/gaps and any subsequent remaining-pathway evaluation.
**Acceptance:** Given valid baseline or module evidence, apply configured rules to the mapped skills. Independent learning assessments can contribute evidence. Merely viewing a course cannot increase mastery, and duplicate processing cannot create conflicting updates. RIASEC interests are not substituted for knowledge evidence.

**Open decisions:** Model, proficiency scale, priors/likelihoods, decay, confidence/uncertainty, thresholds, evidence weighting/reuse, replay and model-version policy. Earlier Bayesian baseline choices need revalidation, not automatic adoption for all tracing.
**Entities/design gaps:** Assessment evidence, competency estimate/model version and processing history. See [consistent learning state](../Consistent%20learning%20state/README.md) and [gap analysis](../Competency%20profiling%20and%20gap%20analysis/README.md).