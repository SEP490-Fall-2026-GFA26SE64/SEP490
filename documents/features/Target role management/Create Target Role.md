# Create Target Role

**Function ID:** REQ-023-F01  
**Actor:** L&D Manager  
**Status:** Implemented  
**Feature:** [Target Role Management](README.md)

## Description

Create a target role in the organization catalog. The L&D Manager creates the target role structure (unique code, title, Job Domain, Career Family, Track, Assigned Domain Expert, and description); Domain Experts will link micro-skills and maintain competency thresholds (REQ-015).

**Input:** Role name, unique code, `domainCode` (`ICT`, `DATA`, `AI`), `familyCode` (`JAVA_BACKEND`, `PYTHON_DATA`, `AI_ML`, `CLOUD_DEVOPS`, `FRONTEND_WEB`, `CYBERSECURITY`), `track` (`PROFESSIONAL` or `MANAGEMENT`), `seniority` (`P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`), `responsibilities` (list of key job duties for the Job Description), `assignedExpertId`, description, and organization context (`organizationId`).  
**Outcome:** An organization-owned target-role record in PostgreSQL/Neo4j with status `DRAFT`.

## Confirmed Related Rules

- **Actor Role & Responsibilities**: L&D Manager (`LD_MANAGER`). The L&D Manager creates, views, edits, and deletes target role outlines. L&D Managers **cannot** add micro-skills (that is exclusively the Domain Expert's role).
- **Track & Seniority Validation & Engine Behavior**:
  - `PROFESSIONAL`: Individual Contributor / Technical Specialist track focusing on deep hands-on code craftsmanship, system implementation, and architecture. Seniority levels strictly restricted to `P1`, `P2`, `P3`, `P4`, `P5`.
  - `MANAGEMENT`: People & Engineering Leadership track focusing on technical coordination, team coaching, project delivery, and organizational governance. Seniority levels strictly restricted to `M3`, `M4`.
  - Any mismatch between track and seniority (e.g. `MANAGEMENT` with `P3`, or `PROFESSIONAL` with `M3`) is rejected with `400 Bad Request`.
  - Pathway recalculation and baseline diagnostics use this track and seniority to weight hands-on technical proficiencies vs team/governance competencies.
- **Key Responsibilities List**:
  - The L&D Manager specifies an array of strings representing the job duties / key responsibilities (Job Description) for the role.
  - This is stored as a list property on the `:TargetRole` node (`r.responsibilities = [...]`).
  - Responsibilities describe qualitative role expectations and differ from `:MicroSkill` nodes (which are atomic skills linked with benchmark target scores exclusively by Domain Experts).
- **Connection to Employee Browsing Contract (REQ-001-F01)**:
  - Under the REQ-001-F01 browsing contract, employees see only same-organization, `ACTIVE`, catalog-valid target roles.
  - A browsable role must contain the required catalog fields and at least one active valid required micro-skill; baseline settings and eligible-question coverage are checked when starting an assessment, not when browsing.
  - A newly created role with unfinished configuration or in `DRAFT`/`SENT`/`REJECTED` status remains hidden from employee browsing and unavailable for new selection.
- **Domain Expert Assignment & Isolation**:
  - Each target role must be assigned to an eligible Domain Expert (`assignedExpertId`).
  - Other Domain Experts **cannot** see the target role if they are not assigned to it (`X-User-Role: DOMAIN_EXPERT` queries automatically filter by `assignedExpertId`).
- **Tenant Isolation**: Every target role is isolated by `organizationId`. A manager cannot view or modify target roles belonging to another organization.
- **Creation Default & Lifecycle**: Newly created target roles default to `DRAFT`.
- **Display Ordering Rule**:
  - In target role catalogs (both L&D Manager and Domain Expert views), any successor draft, sent, or rejected version is **always ordered immediately below** its previous published version within the same lineage (e.g., `v1.1 DRAFT/SENT` is positioned directly beneath `v1.0 PUBLISHED`).
- **Dispatching & Status Transitions**:
  - `DRAFT` &rarr; `SENT`: L&D Manager clicks "Send to Expert" to dispatch the draft for micro-skill threshold mapping.
  - `SENT` &rarr; `REJECTED`: Domain Expert can reject the assignment, returning the draft role to the L&D Manager for adjustment.
  - `SENT` &rarr; `ACTIVE` (`PUBLISHED`): Domain Expert publishes the role to the active graph once required micro-skills are mapped.
- **Uniqueness & Validation**: Role code and name must be non-empty. Duplicate role codes with the same version within the organization/system are rejected with `409 Conflict`.

## Acceptance Baseline

The role is created only in the L&D Manager's organization, with assigned expert metadata, and does not automatically acquire undefined competency requirements.

- A newly created role with unfinished configuration remains hidden from employee browsing and unavailable for new selection. Creating the record alone does not establish readiness.
