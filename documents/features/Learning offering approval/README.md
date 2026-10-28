# Learning Offering Approval

**Requirement:** REQ-053  
**Actors:** Expert submits; L&D Manager reviews and decides  
**Status:** Local Module approval implemented; assessment approval not certified by this workflow
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## Current implementation boundary — 2026-10-28

`/ld-manager/approvals` now uses the backend Module revision workflow instead of browser package state. Expert submits Module/content/mapping together; L&D inspects the exact snapshot, returns required feedback or approves release. Archive requests also require L&D approval. Review identity/time are server-owned. Failed catalog publication remains durable and retryable; a submitted package alone is not employee availability. See [REQ-013 contract](../Learning%20module%20management/README.md) and [system evidence](../../testing/system/REQ-013-module-management.md).

The table below retains the product function inventory; its historical Implemented labels are not evidence that assessment submissions/approval are implemented by the new Module API. No question-bank/assessment approval migration is claimed.

| Function ID | Function | Input | Outcome | Status |
| --- | --- | --- | --- | --- |
| REQ-053-F01 | Submit Learning Offering for Approval | Authorized Expert's new/revised module or assessment | Submission available to L&D at `/ld-manager/approvals` | Implemented |
| REQ-053-F02 | Review Submitted Learning Offering | Authorized L&D and submitted offering | Content/evidence and interactive lessons preview | Implemented |
| REQ-053-F03 | Approve Learning Offering | Submission and authorized L&D approval | Offering approved for organizational use in modules | Implemented |
| REQ-053-F04 | Return Learning Offering for Revision | Submission and L&D revision feedback | Expert can revise returned offering in Content Studio | Implemented |

**Acceptance:** Each of modules and assessments can be submitted, reviewed, approved, or returned. Employee use cannot treat a merely authored/submitted item as approved. Expert authorship does not grant L&D approval authority. Approved packages automatically unlock in the Learning Modules editor.

### L&D module review navigation — REQ-053 (2026-10-28)

Content Approval stays at `/ld-manager/approvals`; Modules and Learning content resolve to `/ld-manager/modules` and `/ld-manager/learning-content`. All retain the L&D shell and Content Approval sidebar selection. Details/history open without switching actor. Submitted authoring revisions expose manager review actions; graph-only catalog entries remain read-only and are not automatically submitted. This routing correction changes no schema, storage responsibilities, seed data or API authorization.

### Per-module catalog intake — 2026-10-28

Option A is now the implementation scope: explicit L&D Occupation assignment → assigned Expert acceptance → draft/edit/submit → L&D decision → existing graph publication. See [intake contract](../Learning%20module%20management/Receive%20Imported%20Module.md). Earlier statements that imported entries remain permanently read-only are superseded by this explicit intake route; listing alone never creates history.
