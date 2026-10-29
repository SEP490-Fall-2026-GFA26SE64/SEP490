> **Current R4 behavior (2026-10-29):** new Module/content creation, reuse and Excel/ZIP import are based on skills and do not require an Occupation selection/grant. Historical occupation tags and the separate catalog intake workflow remain intact. L&D revision details show individually numbered Text/Video lesson cards. See the [current catalog refinement](../Learning%20catalog/README.md#r4-local-refinement--2026-10-29) and [tested UI/manual checklist](../../testing/system/REQ-013-learning-content-R4.md). Older dated rules below are retained for traceability.

> **Current Learning Content runtime (2026-10-29):** ordered Text/Video, private uploads, Excel/ZIP import, full revision preview and persisted learner progress are described in the [current catalog delivery record](../Learning%20catalog/README.md#learning-content-local-delivery--2026-10-29). See [verification limits and manual checklist](../../testing/system/REQ-013-learning-content.md), including the Vimeo provider blocker. The dated historical details below remain for traceability.

> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# Learning Content

**Requirement:** REQ-054  
**Actor:** Expert within assigned disciplines  
**Status:** Scope draft; delivery and storage pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

## REQ-013 integration implemented locally — 2026-10-28

The Module authoring workflow now provides durable creation/list/preview of immutable Markdown content versions in PostgreSQL V27 at `/expert/learning-content`. Direct HTTPS videos can be embedded on a separate line with `[video](https://host/lesson.mp4)`; the package MIME type remains text/markdown. Creator/time and explicit Occupation scopes are stored server-side; Experts need grants for all declared scopes when creating content. Module/content/mapping are reviewed together through the Module revision workflow. No localStorage package is accepted as approval evidence.

This implements the minimal F01/F02 dependency of REQ-013; it does not certify full REQ-054 editing, ordering, removal/history or arbitrary content formats. Changing content for a Module currently means creating a new immutable content record and selecting it in a new Module revision. The renderer supports text/headings/fenced code/direct video, not general HTML/iframe/rich Markdown. [Implementation and test boundaries](../Learning%20module%20management/README.md#implementation-boundary).

Ontology 0.9.0 has no Course entity. Lesson/practice content is organized within a LearningModule. A Module can teach several MicroSkills and a skill can have several teaching Modules; require coverage on both sides and reject duplicate pairs. The directory name is retained for link compatibility. Dummy-only descriptions are no longer the product constraint. New or revised offerings use [L&D approval](../Learning%20offering%20approval/README.md).

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
