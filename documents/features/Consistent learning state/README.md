# Consistent Learning State

## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-046. **Performer:** System. **Status:** Consistency contract pending.
Keep assessment evidence, competency estimates, reviewed guidance, progress and pathway history consistent with catalog references. Finalized adaptive-baseline evidence is emitted once per attempt + MicroSkill and must initialize mastery exactly once; its responses are not duplicated as BKT observations. No automatic cross-store transaction is assumed.

## Historical Specification
Use the alignment above where older details conflict.

Keep relational assessment records and graph-based competency/pathway state consistent, including failure recovery.

**Source:** [REQ-046](../../PRODUCT_OVERVIEW.md)  
**Execution:** Automated persistence coordination.

## Functions

- [Synchronize Learning State](Synchronize%20Learning%20State.md)
- [Recover Incomplete Learning Updates](Recover%20Incomplete%20Learning%20Updates.md)
