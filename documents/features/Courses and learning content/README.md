# Courses and Learning Content

**Requirement:** REQ-054  
**Actor:** Expert within assigned disciplines  
**Status:** Scope draft; delivery and storage pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

Courses/content are organized within a learning module. Dummy-only descriptions are no longer the product constraint. New or revised offerings use [L&D approval](../Learning%20offering%20approval/README.md).

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-054-F01 | Add Course or Content | Authorized module and content details | Course/content attached to module |
| REQ-054-F02 | View Courses and Content | Authorized module/content scope | Existing content visible for authoring |
| REQ-054-F03 | Update Course or Content | Content and permitted changes | Revised content for approval |
| REQ-054-F04 | Organize Module Content | Module and intended content organization | Updated organization within module |
| REQ-054-F05 | Remove Course or Content | Authorized content and removal action | Content removed/withdrawn under agreed history rules |

**Acceptance:** An assigned Expert can add/view/update/organize/remove content in a module and submit it for approval. An Expert outside the discipline cannot author it. Employee access uses approved availability rules.
**Open decisions:** Formats/hosting, required fields, course/module cardinality and ordering, completion rules, removal/history, approval granularity, and external resource validation.
**Entities/design gaps:** Course/content, module membership, versions and approval; dataset course records are not proof of runtime schema support.