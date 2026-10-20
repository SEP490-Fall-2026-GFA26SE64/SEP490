# Baseline Knowledge Assessment

## Current scope

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md). **Requirement:** REQ-002. **Actors:** L&D Manager configures an adaptive Blueprint; Employee starts/resumes/submits an individual adaptive baseline attempt.

The target direction removes the shared Generate → Review → Publish baseline lifecycle. One organization + Occupation owns versioned Blueprint configuration and one current pointer. Saving/finalizing a valid version switches that pointer atomically; it is not a separate approval/publication step. L&D may run an answer-safe ephemeral dry run, but it stores no generated assessment history. Each Employee attempt selects its questions adaptively and pins Blueprint, item, IRT parameter, model and mastery-mapping versions.

```text
Neo4j Occupation and role-skill catalog
  -> L&D saves, dry-runs and activates an immutable Blueprint version
  -> Employee starts/resumes one server-timed adaptive attempt
  -> 3PL selects items and estimates theta + SE per MicroSkill
  -> submit/auto-submit stores immutable result and mastery evidence
```

The approved target database and transaction boundary are defined in [Adaptive Baseline Data Architecture](Adaptive%20Baseline%20Data%20Architecture.md). It remains a planned schema, not a live migration. The current runtime still requires the Cluster 2 cutover from the superseded fixed lifecycle.

**Approved entry paths (2026-10-20):** baseline never blocks choosing an available role. Every Employee without a mastery-producing baseline for that Occupation—including an existing employee first entering the system—must complete it before mastery-dependent gap/pathway steps. One successful baseline closes the Employee + Occupation allowance and supports later roles in the same Occupation; another Occupation has its own allowance. Voluntary Occupation baseline uses the union of active-role pools. Only invalidated attempts that emitted no mastery may be replaced.

The approved redesign acceptance plan is [REQ-002 Adaptive Baseline test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md); it contains no execution result yet.

## Functions

| Function | Status |
| --- | --- |
| [Configure Baseline Assessment](Configure%20Baseline%20Assessment.md) | Cluster 1 adaptive Blueprint/Test Blueprint contract approved; technical IRT policy is system-owned and initially backend-configured. |
| [Complete Baseline Assessment](Complete%20Baseline%20Assessment.md) | Cluster 1 adaptive attempt/IRT/result/replacement contract approved. |
| [Adaptive Baseline Data Architecture](Adaptive%20Baseline%20Data%20Architecture.md) | Target PostgreSQL ownership, tables, transactions and legacy disposition defined; migration not implemented. |
