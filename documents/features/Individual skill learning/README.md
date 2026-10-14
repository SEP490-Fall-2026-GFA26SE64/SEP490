# Individual Skill Learning

**Requirement:** REQ-055  
**Actors:** Employee participates; system discovers content and records progress/evidence  
**Status:** Scope draft; independent progress policy pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-055-F01 | Browse Available Micro-Skills | Employee and discovery criteria | Available skills for optional learning |
| REQ-055-F02 | Choose Individual Skill | Employee and available micro-skill | Independent learning context, not a role pathway edit |
| REQ-055-F03 | Access Mapped Learning Content | Selected skill and available approved mappings | Modules/courses mapped to the skill |
| REQ-055-F04 | Complete Independent Learning and Assessment | Independent content activity and assessment answers | Progress and mapped evidence recorded through owning assessment/tracing functions |

**Acceptance:** An Employee can select a skill and access mapped content without starting/changing a target-role pathway. Completing its assessment can update competency estimates; opening content alone is not mastery. Independent selection is not manual pathway module inclusion.
**Open decisions:** Discovery/availability, prerequisites, no-content outcomes, enrollment/repetition, shared progress with pathway learning, later recalculation interaction, and assessment eligibility.
**Entities/design gaps:** Independent learning context/progress and existing assessment evidence; separate from target-role selection and pathway revision.