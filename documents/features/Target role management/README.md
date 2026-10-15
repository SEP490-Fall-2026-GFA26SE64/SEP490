# Target Role Management

## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-023. **Actors:** L&D Manager creates/manages; Expert configures assigned requirements. **Status:** Existing evidence requires scope review.
L&D creates/updates roles, assigns an Expert, and views configuration status. Expert owns competency/micro-skill requirements, proficiency and importance. Completed configuration is submitted to L&D for separate publication (REQ-052). Organization Administrator/`ADMIN` is not an additional product actor; runtime codes require migration design.

## Historical Contract and Evidence
Existing implementation claims below are not recertified by this documentation update.

Maintain the organization's Software Engineering development goals and career pathways; Domain Experts author detailed micro-skill proficiency benchmarks and validate graph readiness.

**Source:** [REQ-023](../../PRODUCT_OVERVIEW.md)  
**Actors:** L&D Manager (`LD_MANAGER`), Domain Expert (`DOMAIN_EXPERT`), Organization Administrator (`ADMIN`)

## Functions Matrix

| Function ID | Function Specification | Primary Actor | Status | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-023-F01** | [Create Target Role](Create%20Target%20Role.md) | L&D Manager | **Implemented** | Unit &amp; Integration |
| **REQ-023-F02** | [View Organization Target Roles](View%20Organization%20Target%20Roles.md) | L&D Manager | **Implemented** | Unit &amp; Integration |
| **REQ-023-F03** | [Update Target Role](Update%20Target%20Role.md) | L&D Manager | **Implemented** | Unit &amp; Integration |
| **REQ-023-F04** | [Delete Target Role](Delete%20Target%20Role.md) | L&D Manager | **Implemented** | Unit &amp; Integration |
| **REQ-023-F05** | [Expert Assigned Target Roles & Micro-skill Authoring](Expert%20Assigned%20Target%20Roles.md) | Domain Expert | **Implemented** | Unit &amp; Integration |