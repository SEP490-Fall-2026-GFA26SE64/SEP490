# Feature Implementation Brief Template

Use the relevant sections below for one temporary working contract per bounded task in the host's session storage, outside tracked project documentation. Never insert this template into a feature README. Reference the owning domain, existing table row and stable anchor; do not duplicate the domain document or leave placeholder text as confirmed requirements. Resolve links relative to the temporary document or use absolute file links. A multi-function slice shares one brief listing all affected IDs.

For a missing specification, draft a clearly labeled Proposed definition here and identify its intended domain; distinguish missing documentation for confirmed scope from a proposed scope extension. Keep the source register and feature READMEs unchanged during planning. For customization/documentation tasks, use the approved task brief instead of inventing a product REQ ID.

## Implementation Brief: FUNCTION ID AND NAME

| Context | Value to record |
| --- | --- |
| Function IDs and source | Existing IDs/anchors and confirmed source; label proposed additions explicitly. |
| Actor / performer | Human roles or System, organization/assignment/entitlement scope. |
| Outcome | The observable problem solved. |
| Contract revision | Increment when material decisions change; initial revision 1. |
| State | Proposed, Clarifying, Awaiting Approval, Approved, Implementing, Verifying, Blocked, Complete or Documentation Only. |
| Scope decisions | Confirmed / unresolved, with source or user answer. |
| Definition of Done decisions | Confirmed / unresolved, with measurable criteria. |
| Business-rule decisions | Confirmed / unresolved, with source or user answer. |
| Verification decisions | Confirmed / unresolved, with agreed checks and prerequisites. |

### Existing Implementation and Required Delta

Inspect the affected code, integrations, UI and nearby tests before proposing changes. Keep the inventory bounded to the requested function and direct dependencies; source observations and historical tests are not proof of a current runtime pass.

| Required behavior | Current file / symbol evidence | Status | Existing implementation to preserve / reuse | Required delta or verification |
| --- | --- | --- | --- | --- |
| Replace with requested behavior | Actual inspected owner and relevant tests | Implemented, Partial, Missing, Incorrect or Unverified | Existing endpoint, service, component, mapping or helper | Specific gap; verify unknowns instead of rebuilding |

If the behavior already exists, propose verification and necessary documentation only. Every proposed code change must address an evidenced gap in the approved scope; do not add parallel capabilities or speculative abstractions.

### Scope and Behavior

- Included behavior: specify the bounded slice, actors and interfaces.
- Excluded behavior: identify related capabilities that this task will not implement.
- Inputs and outcomes: required/optional inputs, validation, resulting state and visible errors.
- Business rules: eligibility, transitions, authorization, isolation and applicable failure/retry/concurrency behavior.
- Dependencies: owning contracts/adapters, availability and blockers; distinguish current implementation from target architecture.

### Field and Data Contract

Inventory only entities/fields affected by this operation. Account for every affected required field, preserve allowed nulls, and document intentional projections. Private/server-managed fields need not be client-visible or editable.

| Field / relationship | Source and store owner | Type / nullability | Validation and lifecycle | Set by / mapped through | Authorized API/UI exposure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Replace with actual field | Existing definition or explicitly proposed migration | Required or legitimately nullable | Rule and history/version behavior | Backend, mapper, client or integration | Hidden, read-only or editable for named actor | Assertion and expected value/state |

### Acceptance and Definition of Done

Give each criterion a stable local ID such as AC-01. Use observable Given/When/Then outcomes, not statements such as "works correctly."

| Criterion | Scenario / expected result | Required for DoD | Current evidence |
| --- | --- | --- | --- |
| AC-01 | Replace with a specific agreed behavior | Yes, or explicitly agreed exclusion with reason | Not Run until actually verified |

Define what Complete means for this slice, including required tests and documentation. State whether the approved deliverable is a local/demo slice or production-ready behavior. A dependency or missing test environment is a blocker, not proof of completion.

### Verification Plan

| Acceptance IDs | Level and existing test/file to reuse | Actor, organization and fixture data | Command or browser steps | Expected observable result | Evidence destination |
| --- | --- | --- | --- | --- | --- |
| Replace with IDs | Unit, component, API/security, architecture, integration or system | Include relevant wrong-role/cross-organization cases | Resolve actual executable tests and URLs | Exact assertion, persisted/reloaded result or permitted null | Existing per-REQ evidence or suitable new dedicated file |

For UI changes include Playwright, affected viewport(s), screenshots, loading/empty/error states, relevant negative cases, console/network inspection and persisted/reloaded effects. Record prerequisites such as Docker, browser and real API availability. Mark genuinely irrelevant test levels Not Applicable with a reason; unavailable prerequisites are Blocked.

### High-Level Implementation Proposal

- Evidence-backed delta from the inventory; identify working behavior that remains unchanged.
- Backend/application/domain changes and existing patterns to reuse.
- Frontend/API/query/shared component changes, where applicable.
- Data/API contracts and explicitly proposed migrations or integration work.
- Existing technologies; explain any proposed dependency/technology change.
- Intended files, execution order, focused first check and remaining gates.
- Risks, assumptions, prerequisites and any operations needing separate permission.

### Decisions and Approval

| Date / question | User answer or existing confirmed source | Rationale / affected rule or criterion |
| --- | --- | --- |
| Record one decision per answered question | Never treat a recommendation or skipped question as the answer | Update the corresponding brief sections before asking the next question |

Keep a concise decision record, not a full chat transcript. Retain meaningful changed decisions without duplicating historical scope.

| Approval | Recorded value |
| --- | --- |
| Revision presented | Current contract/plan revision |
| Decision | Pending, Approve and implement, Revise, or Documentation only |
| User confirmation | Date and concise explicit confirmation from the active conversation |
| Invalidation | Material changes since approval; return to clarification/approval when applicable |

A stored approval flag is not independent authorization. Verify the matching explicit conversation approval before edits; reconfirm on a new session when that evidence is unavailable. Approval covers only this revision/scope, not commits, deployments or destructive operations.

### Delivery and Evidence

| Criterion / check | Actual command or browser procedure | Date / environment | Result | Evidence / blocker |
| --- | --- | --- | --- | --- |
| Replace with acceptance/check ID | What actually ran, not what was planned | Recorded run context | Passed, Failed, Blocked or Not Run | Actual result/artifact or exact next action |

Summarize delivered behavior, key files, updated documents and remaining limitations. Preserve prior test results; do not rewrite them as evidence for this revision. Only mark Complete when all required DoD criteria are satisfied.

Manual checklist: actual URL or relevant editor navigation, prerequisites, actor/organization/test data, numbered actions and expected outcomes. For documentation-only tasks, provide document/editor checks instead of a fabricated application URL.

### Completion Publication

Only after implementation and required verification pass, update the affected feature README sections with concise delivered outcomes, actors/eligibility, meaningful inputs/validation, business rules and relevant limitations. Preserve stable IDs/anchors; recheck proposed IDs before publishing new definitions. Do not paste this brief, inventory, approval record, test cases/results, manual checklist or architecture design into the README. Keep evidence and technical details in their dedicated documents and link only when useful.

Retain this temporary file for paused, blocked or planning-only work and report its path. After successful publication and delivery reporting, remove only this task's temporary brief, not its evidence or other session files.