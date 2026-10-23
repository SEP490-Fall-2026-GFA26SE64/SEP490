# Initial Pathway Generation

## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-042. **Performer:** System. **Status:** Generation/review policy pending.
Propose ordered system-selected modules from competency gaps, outcomes and prerequisites. Send the first Employee/role pathway to an Expert for review, inclusion/exclusion and confirmation before learning starts. Generation does not itself activate Employee learning access.

**Ontology 0.9.0:** Resolve all candidate Modules for required skill gaps through many-to-many TEACHES. Explain matched skill IDs, select suitable coverage without requiring every provider, and deduplicate a selected Module covering multiple gaps. Skill prerequisites gate the relevant learning activities; intra-module foundation/dependent ordering must be feasible. Unavailable approved coverage returns PATHWAY_UNRESOLVED. Ranking weights remain open.

## Historical Specification
Use the alignment above where older details conflict.

Generate an explainable initial module sequence from baseline evidence and target-role gaps. This is a must-have capability.

**Source:** [REQ-042](../../PRODUCT_OVERVIEW.md)  
**Execution:** Automated; Employee consumes the result and Domain Expert reviews it.

## Functions

- [Generate Initial Adaptive Pathway](Generate%20Initial%20Adaptive%20Pathway.md)