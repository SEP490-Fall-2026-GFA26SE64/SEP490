# Create RQ3 Dataset

**Function ID:** REQ-033-F03  
**Actor:** Platform Administrator  
**Status:** Pending clarification  
**Feature:** [Benchmark Dataset Creation](README.md)

## Description

Create comparable static and adaptive pathway scenarios for 100 simulated learners, with module failures as described in the registration.

**Input:** Initial learner states, target roles, static curriculum, and reproducible failure scenarios.  
**Outcome:** An RQ3 simulation dataset for evaluating remedial module counts and target-role gap/distance.

## Open Decisions

- Failure distribution and whether outcomes depend on learner skill states.
- Equivalent event generation for different pathways, retry limits, and stopping conditions.
- Static curriculum definition, mastery-transition model, and gap/distance metric.

## Acceptance Baseline

Both algorithms can be evaluated against equivalent scenarios; fewer modules alone must not be treated as proof of valid competency coverage.