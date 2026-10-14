# Discipline Management

**Requirement:** REQ-050  
**Actor:** L&D Manager  
**Status:** Scope draft; lifecycle and schema pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

Disciplines organize expertise and learning content. [Expert assignments](../Discipline%20Expert%20assignment/README.md) restrict content authoring. A discipline is not automatically identical to the existing `JobDomain` graph entity.

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-050-F01 | Create Discipline | Authorized L&D and discipline details | New discipline available for assignment/content organization |
| REQ-050-F02 | View Disciplines | Authorized L&D and optional discovery criteria | Discipline list/details |
| REQ-050-F03 | Update Discipline | Discipline and permitted detail changes | Updated discipline without unauthorized content edits |
| REQ-050-F04 | Deactivate Discipline | Discipline and authorized lifecycle action | Discipline deactivated under agreed reference rules |

**Acceptance:** L&D can create, view, update, and deactivate a discipline. Employee/Expert authoring permissions do not grant discipline administration. Deactivation does not erase historical assessment evidence.
**Open decisions:** Required fields/uniqueness, discipline-to-domain mapping, content membership, deactivation effects on assignments/publication/learning, and history/concurrency.
**Entities/design gaps:** Discipline and content membership; field types and storage boundaries require architecture agreement before implementation.