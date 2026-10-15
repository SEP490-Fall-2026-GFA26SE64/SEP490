# System Activity Monitoring

**Requirement:** REQ-058  
**Actor:** System Administrator  
**Status:** Scope draft; monitoring/access policy pending  
**Source:** [System Overview](../../adapt_learn_graph_system_overview.md)

| Function ID | Function | Input | Outcome |
| --- | --- | --- | --- |
| REQ-058-F01 | View Audit Records | Authorized System Administrator and query criteria | Permitted audit records for oversight |
| REQ-058-F02 | View Operational Activity | Authorized System Administrator and activity criteria | Operational activity for troubleshooting |

**Acceptance:** System Administrator can inspect authorized records. Monitoring does not expose passwords, provider secrets, or automatically grant unrestricted employee answer/review access. Non-administrators cannot use administrator monitoring operations.
**Open decisions:** Events, filters, detail redaction, retention, exports, diagnostics sources, and access audit requirements.
**Entities/design gaps:** Existing audit/operational records need a reviewed access/read contract; this specification does not assert a working monitoring UI.