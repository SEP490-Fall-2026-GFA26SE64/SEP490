# Create Target Role

**Function ID:** REQ-023-F01  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Target Role Management](README.md)

## Description

Create a Software Engineering target role in the organization catalog. Expert assignment and skill-requirement editing are separate functions.

**Input:** Role name and descriptive attributes.  
**Outcome:** An organization-owned target-role record.

## Confirmed Related Rule

Employee browsing exposes only published, active, baseline-ready target roles (REQ-001-F01, 2026-09-27). Option A defines readiness as role requirements and prerequisites being defined, baseline settings saved, and eligible-question coverage passing for the configured scope. Learning modules and module assessments are not visibility prerequisites. An unfinished baseline setup is excluded from list/detail responses even if published and active. Availability is checked on requests and before selection, with no background updates to idle pages. Publication authority, detailed authoring validation, concurrent-edit consistency, and creation default remain open.

Employee role details include description and responsibilities, seniority grade, and required proficiency per micro-skill. Seniority uses `P1`–`P5` for the professional track and `M3`–`M4` for the management track; the selected grade must match the role track. The detailed meaning of a grade remains specific to the role's domain/family. Experts maintain the skill requirements.

## Open Decisions

- Additional required metadata, duplicate-name rules, role codes, and how each domain/role family describes the meaning of its configured grade.
- Draft/published lifecycle and readiness checks before employees can select the role.
- Whether expert assignment is mandatory at creation and who publishes the completed role.

## Acceptance Baseline

The role is created only in the administrator's organization and does not automatically acquire undefined competency requirements.

- A newly created role with unfinished configuration remains hidden from employee browsing and unavailable for new selection. Creating the record or setting publication/active status alone does not establish readiness.
