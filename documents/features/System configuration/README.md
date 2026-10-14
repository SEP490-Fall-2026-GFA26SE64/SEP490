# System Configuration

**Requirement:** REQ-057  
**Actor:** System Administrator  
**Status:** Scope draft; configuration inventory pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-057-F01 | View System Configuration | Authorized System Administrator | Organization-wide technical options |
| REQ-057-F02 | Update System Configuration | Permitted technical option changes | Validated configuration changes |

**Acceptance:** System Administrator can view/update agreed technical settings. This workflow does not grant baseline business-rule configuration (L&D), module assessment authoring (Expert), or target-role publication/learning approval (L&D).
**Open decisions:** Option inventory, editable versus deployment-managed settings, secret handling, validation, activation/restart behavior, and history.
**Entities/design gaps:** Technical settings/history; credentials must not be exposed as ordinary configuration values.