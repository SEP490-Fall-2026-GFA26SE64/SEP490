# Discipline Expert Assignment

**Requirement:** REQ-051  
**Actor:** L&D Manager  
**Status:** Scope draft; authorization details pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

Discipline assignment authorizes subject-matter content management. It is separate from [target-role Expert assignment](../Expert%20assignment/README.md).

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-051-F01 | View Discipline Expert Assignments | Authorized L&D and discipline | Current assignments |
| REQ-051-F02 | Assign Expert to Discipline | Discipline and eligible Expert | Recorded assignment for authorized content scope |
| REQ-051-F03 | Remove Expert from Discipline | Existing assignment and authorized L&D | Removed assignment with retained history |

**Acceptance:** L&D can view/assign/remove Experts. An unassigned Expert cannot author discipline-specific skills or content. A target-role assignment does not automatically grant unrelated discipline access.
**Open decisions:** Multiple Experts/disciplines, eligible account status, removal effects on drafts/reviews and role assignments, and authorization cache/concurrent request behavior.
**Entities/design gaps:** Discipline assignment, history and content scope; no legacy role assignment is silently repurposed.