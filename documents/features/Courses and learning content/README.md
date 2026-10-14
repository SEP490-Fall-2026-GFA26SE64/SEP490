# Learning Content

**Requirement:** REQ-054  
**Actor:** Expert within assigned disciplines  
**Status:** Scope draft; delivery and storage pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

Ontology 0.8.0 has no Course entity. Lesson/practice content is organized within a LearningModule. Each module teaches exactly one MicroSkill and each skill has one module. The directory name is retained for link compatibility. Dummy-only descriptions are no longer the product constraint. New or revised offerings use [L&D approval](../Learning%20offering%20approval/README.md).

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-054-F01 | Add Learning Content | Authorized module and content details | Content attached to module |
| REQ-054-F02 | View Learning Content | Authorized module/content scope | Existing content visible for authoring |
| REQ-054-F03 | Update Learning Content | Content and permitted changes | Revised content for approval |
| REQ-054-F04 | Organize Module Content | Module and intended content organization | Updated organization within module |
| REQ-054-F05 | Remove Learning Content | Authorized content and removal action | Content removed/withdrawn under agreed history rules |

**Acceptance:** An assigned Expert can add/view/update/organize/remove content in a module and submit it for approval. An Expert outside the discipline cannot author it. Employee access uses approved availability rules.
**Open decisions:** Formats/hosting, required fields, ordering of sections within a module, completion rules, removal/history, approval granularity, and external resource validation.
**Entities/design gaps:** Module content, versions and approval; dataset content records do not establish runtime delivery support.
