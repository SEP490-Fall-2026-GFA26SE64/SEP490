# Target Role Publication

**Requirement:** REQ-052  
**Actor:** L&D Manager; Expert submits completed configuration  
**Status:** Scope draft; lifecycle policy pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-052-F01 | Review Target Role Configuration Status | Authorized L&D and Expert-completed role configuration | Visible configuration status for publication decision |
| REQ-052-F02 | Publish Target Role | Completed configuration and authorized L&D action | Published role available under Employee discovery/selection rules |
| REQ-052-F03 | Unpublish Target Role | Published role and authorized L&D action | Role withdrawn from new Employee discovery/selection |

**Acceptance:** Given an Expert-completed competency configuration, L&D can review and publish the role without editing Expert requirements. Expert assignment/configuration alone does not authorize publication. An unpublished role cannot be newly selected as a published offering.
**Open decisions:** Completion validation, revisions and re-review, lifecycle state/storage mapping, withdrawal effects on existing selections/attempts/pathways, and concurrent publication/selection.
**Entities/design gaps:** Role configuration completion and publication history. Existing `ACTIVE` status must not be assumed to implement the separate publication gate.