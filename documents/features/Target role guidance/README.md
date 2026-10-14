# Target Role Guidance

**Requirement:** REQ-048  
**Performers:** System generates; Employee views  
**Status:** Scope draft; detailed workflow pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-048-F01: Generate Target Role Guidance

**Input:** Employee baseline competency evidence, RIASEC interest results, and available target-role requirements.
**Outcome:** AI-suggested target roles and explanatory comments available for authorized [Expert review](../AI%20role%20guidance%20review/README.md), not an automatic Employee role selection.
**Acceptance:** Given both assessment results, generation produces suggestions/comments associated with their evidence for Expert review. Generation alone neither selects a role nor authorizes learning.

## REQ-048-F02: View Reviewed Target Role Guidance

**Input:** Authenticated Employee and their Expert-reviewed guidance.
**Outcome:** Employee views reviewed suggestions/comments and can proceed to [role selection/confirmation](../Target%20role%20selection/README.md).
**Acceptance:** Employee sees their reviewed guidance; unreviewed/rejected guidance cannot be treated as Expert-confirmed. Another Employee's guidance is inaccessible.

**Open decisions:** AI provider, data minimization/retention, readiness and failure handling, ranking, review assignment, rejection/revision delivery, and visibility of pending/rejected records. The older pending soft-skill-comment visibility rule is not inherited.
**Entities/design gaps:** Guidance, evidence references, suggestions/comments, review outcome and history; no new persistence fields are approved here.