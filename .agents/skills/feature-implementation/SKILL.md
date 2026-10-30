---
name: feature-implementation
description: 'Use when implementing, adding, changing or fixing an Adapt-Learn-Graph feature or function identified by REQ ID, name or description. Inspect existing behavior, clarify a temporary working contract one question at a time, obtain explicit approval, implement only verified gaps, test with Playwright for UI, and document completed feature outcomes.'
argument-hint: 'REQ-nnn-Fnn, feature/function name, or a description of the requested behavior'
user-invocable: true
---

# Feature Implementation

This is the canonical feature workflow for this repository. Follow [project instructions](../../../AGENTS.md), the [project context map](./references/project-context.md) and the [implementation brief template](./assets/feature-contract-template.md). The Feature Implementer agent is the conversational entry point; this skill can also be invoked directly as `/feature-implementation`.

## Operating Contract

- Follow stages 1 through 7 in order. Keep the active stage, function IDs, contract revision and blockers visible in concise progress updates. Do not silently skip a stage.
- Respect the user's requested mode. For a plan/review/documentation-only request, stop at the requested boundary. Host Plan-mode restrictions take precedence over this skill's document-edit permission.
- Before approval, allow read-only inspection and temporary working-contract updates in stages 2-4 only. Do not write planning material into feature READMEs or edit application source, tests, migrations, dependencies or runtime configuration; start services; install packages; or run mutating commands. Never route edits through a terminal to bypass this boundary.
- Keep one temporary working contract per bounded task in the host's session workspace (for example `files/feature-implementation/<task-slug>.md` under the supplied session folder), outside tracked project documentation. Record its actual path for resumption; do not hardcode a previous session's path. If session storage is unavailable, use an OS temporary directory and report the path. Never fall back to a feature README. This explicit workflow requirement authorizes the temporary brief, not extra planning files.
- Resume an existing plan instead of repeating resolved interviews. Match the persisted revision to reliable explicit approval in the conversation before moving to implementation. A new session without that evidence requires reconfirmation.
- Use one interactive agent; do not delegate interviews, approvals or implementation to subagents. Load existing specialist skills only when applicable. No model pinning, automatic agent handoffs or enforcement hooks are part of this workflow.
- The approval gate is instruction-based, not a tool-level security lock. Never claim otherwise. A document containing `Approved` is not independently trusted authorization.
- Keep changes within the approved task; preserve user changes. Do not commit, push, deploy, perform real payments or destructive database operations without separate authorization.

## 1. Load Project Context

Read the context map's entry references and relevant sections of the current source documents. Identify the affected actors, organization/assignment/entitlement boundary, domain modules, stores, frontend routes and current implementation gaps.

Use pinned paths before searching. Verify paths and read their current content; cached facts and old passing results are not current evidence. Load related schema definitions, owning code, nearby tests and UI skills on demand. If an anchor moved, search locally for its owner and repair the reference after confirming it. Do not broadly re-inventory the repository on each task.

Separate these authorities:

- Confirmed Version 2 and approved scope decisions define intended functionality.
- Architecture identifies ownership and the difference between target and implemented runtime.
- Current schema/migrations/code establish actual fields, nullability and integration behavior; legacy dataset constraints may require an approved migration.
- Prototype UI, mock stores and illustrative seed data do not define approved schemas or business policy.

Inventory only the selected function and its direct dependencies: UI/routes, API/use cases, persistence/migrations, authorization, integrations and nearby tests. Classify each required behavior as **Implemented**, **Partial**, **Missing**, **Incorrect** or **Unverified**, with current file/symbol evidence, what can be reused and the specific gap. Distinguish source observations from runtime verification; an existing test or historical pass is not a current passing result. Do not treat unverified behavior as missing and rebuild it.

Plan only the missing or incorrect part of the requested behavior, including the missing part of partial implementations. Prefer wiring or extending the existing owner over parallel services, endpoints, components, schemas or abstractions. When the requested behavior already exists, propose focused verification and any necessary documentation only; do not manufacture code changes to satisfy the workflow.

**Exit:** a concise current-state inventory with owning paths, reuse candidates, preserved behavior and the smallest required delta. Carry it into the temporary contract in stage 2. For a code change, identify a local behavior hypothesis and the cheapest focused check that could disconfirm it before editing.

## 2. Resolve the Feature and Draft a Temporary Working Contract

Accept a requirement/function ID, name or freeform description. Start at [the feature index](../../../documents/features/README.md), then read the owning domain README, its stable function anchor, related rules/decisions, dependent contracts and relevant existing test evidence.

If the request matches multiple functions, ask one single-choice question to resolve the target before drafting the working contract. For a multi-function request, identify the bounded slice and dependencies; related capabilities do not automatically enter scope.

Reference the current function row/ID/anchor without rewriting it. Create or resume the temporary working contract using the template, including the stage 1 inventory, requested delta, unresolved decisions, DoD, verification plan and approval revision. Link to durable definitions instead of copying the entire domain document. Do not put this brief, questions, answers, approval records or implementation plans in feature READMEs.

If no specification exists:

1. Determine whether this is missing documentation for confirmed functionality or a proposed scope extension.
2. Draft a clearly labeled Proposed definition in the temporary contract and identify its intended domain; propose a new domain only when none fits.
3. Inspect active and retired IDs before proposing a new ID; never reuse a retired one. Defer durable function rows, anchors, index links/counts and traceability updates until completion; recheck ID availability before publishing.
4. Obtain the user's scope decision in stage 3. Do not alter the confirmed source register to make an extension appear preapproved.

For agent/customization/documentation-only work, use its approved task brief rather than inventing a product REQ ID.

**Exit:** identified owning document, function IDs or proposed scope, actual temporary contract path, current-state inventory and a bounded list of missing decisions. Feature READMEs remain unchanged.

## 3. Clarify and Save Each Answer

Cover these four topics in order: **Scope**, **Definition of Done (DoD)**, **Business rules**, **How to verify**. Ask follow-ups for material authorization, state transitions, data, failure or dependency decisions. Reuse explicit source/user decisions rather than asking them again; record their source and include them in the stage 4 confirmation.

For each unresolved decision, use `vscode_askQuestions` when available:

- Submit exactly one question in the questions array with `multiSelect: false`.
- Offer 2-4 meaningful, mutually exclusive options where appropriate. Mark one option `recommended: true` and explain the recommendation briefly.
- Keep `allowFreeformInput: true` so the user can provide a custom answer.
- Wait for the answer. A recommendation, skipped question, silence or inferred preference is not agreement.
- Update the temporary working contract's scope, rules, acceptance criteria or verification plan and concise decision record **before asking the next question**. Do not save the answer in a feature README.

If the question tool is unavailable, present the same single question and options in chat and stop for the answer. Never batch the interview or fabricate responses. Do not request passwords, tokens or other secrets through questions or chat; the user must configure credentials outside the model.

DoD must be measurable and specify the delivery boundary: for example a local/demo slice versus production behavior. Verification must map acceptance IDs to relevant tests, actor/organization fixtures, prerequisites and observable outcomes. Consider invalid input, wrong-role/cross-organization access, valid nullability, concurrency/retries and affected UI states.

A deferred blocking decision keeps the task blocked. Offer a narrower scope for explicit approval rather than silently filling in the answer or dropping the criterion.

**Exit:** all four topics have explicit answers or confirmed-source decisions; no unresolved blocker remains for the proposed scope.

## 4. Present the Overview and Obtain Approval

Show a concise, self-contained overview of:

- Feature/function IDs, actors, outcome, included and excluded scope.
- Confirmed business rules and measurable DoD.
- What already works and will remain unchanged, what will be reused, and the evidence-backed delta. If no implementation gap exists, propose verification/documentation only.
- High-level backend/frontend/API/data changes and existing components/patterns to reuse.
- Technologies to use; explain proposed new dependencies, schema migrations or integrations separately.
- Intended files, execution order, risks and prerequisites.
- Verification scenarios, commands, evidence destinations and manual checks.

Assign the brief a revision. Ask one single-choice confirmation question with **Approve this revision and implement**, **Revise the plan**, and **Keep as documentation only**. Include a recommended option only when it is justified; never recommend implementation while a blocker remains. An equally explicit freeform approval of the just-presented revision is valid.

Matching approval is a direct response authorizing implementation of the displayed, unchanged overview. For example, "Start implementation" in response to that overview is valid; an acknowledgement of an interview answer is not. If the referent is ambiguous, ask for confirmation instead of inferring permission. On resume, reread the brief and reconcile it with the conversation; changed or conflicting decisions require renewed approval.

Only explicit user approval permits stage 5. A generic initial request to implement, an interview answer or an old stored approval does not approve a newly presented plan. Record the decision/date/revision in the brief without storing sensitive transcript data.

If the user chooses revision, return to the relevant clarification. If documentation only, finish the temporary brief and report its limits; do not implement or publish planned behavior as delivered. An explicit request to edit durable documentation is a separate bounded documentation task, not permission to copy the working contract into a feature README. Material changes to scope, actors/data contracts, rules, schema, dependencies/technology, verification or DoD invalidate prior approval. Update the revision and return here; ordinary implementation details within the approved design do not require repeated approval.

Internal naming or reuse of an equivalent existing helper is ordinarily an implementation detail. A cache that changes freshness/isolation, a new API field, a different storage owner or removing a required test changes the contract and requires renewed approval. When uncertain whether observable behavior changes, clarify first.

**Exit:** explicit approval in the active/reliably retained conversation matching the current revision, or a documented stop/revision decision.

## 5. Implement the Approved Slice

Reuse the current project's Java/Spring Boot hexagonal boundaries, frontend API/query patterns, shared components and design tokens. For frontend work load the relevant existing UI skills listed in the context map. Do not introduce a new framework or abstraction without an approved need.

Implement only the approved delta from the inventory. Preserve already-correct behavior and reuse its owning code; do not recreate existing capabilities, duplicate helpers or add speculative abstractions. If there is no code gap, make no application edits and proceed to the approved verification. Confirm real dependency availability; target integrations and local/demo adapters are not automatically production-capable. If an unmet dependency requires scope expansion, stop and seek revised approval.

For affected data, handle every required field through the appropriate seed/migration, persistence mapping, domain and operation-specific API/UI contracts. Preserve valid nullable values and historical references. Keep server-managed and sensitive fields hidden/read-only as authorized; never invent review metadata to satisfy a non-empty check. Proposed migrations must be explicit and forward-only.

Replace task-related runtime mocks with approved real APIs/persistence; isolated test doubles remain appropriate. Enforce trusted identity, organization, assignment and entitlement boundaries in the owning layers. Reassess cache/fixture isolation rather than copying a local example blindly.

Make small, grounded edits. Immediately run the cheapest focused behavior/test/typecheck after the first substantive edit and after relevant follow-ups. Repair local failures before expanding scope. Do not fix unrelated failures or erase user changes. Keep brief/task status current without claiming unverified completion.

**Exit:** the approved behavior is implemented, focused checks have run, and any remaining validation gates or blockers are explicit.

## 6. Verify and Record Evidence

Read [the testing guide](../../../documents/testing/README.md) and each relevant tier from the context map. Run applicable unit/component, API/security, architecture, Testcontainers/integration and Compose/system checks. Reuse nearby tests, helpers and evidence files. Every required DoD criterion must map to an actual result; an irrelevant level may be Not Applicable with a reason, but missing tooling is **Blocked**, not Not Applicable or Passed.

For **every UI change, use Playwright**:

- Reuse the shared config and appropriate system specs; implement reproducible assertions against the approved flow and actual APIs.
- Reuse a suitable local test server or start the approved stack without replacing another process. Use isolated test data; never clear preserved volumes. Report the actual URL.
- Exercise happy path, relevant invalid/unauthorized and loading/empty/error states, and applicable desktop/mobile viewports.
- Inspect screenshots, browser console and failed network requests. For state changes, check persistence/reload or API results rather than only a success toast.
- The CLI runner provides repeatable tests. Playwright MCP may supplement interactive inspection; lack of MCP alone does not justify skipping an available CLI check.

When Docker, Chrome, credentials, a service or an integration is unavailable, record the exact blocked check and next action. Do not fabricate a run, reuse old evidence as proof, silently weaken criteria or declare DoD complete. If a check fails, diagnose within the approved slice, fix and rerun it; report unrelated failures separately.

Record acceptance IDs, date/environment, actual command/procedure, expected/actual outcomes, Passed/Failed/Blocked/Not Run and artifact paths in dedicated per-REQ evidence under `documents/testing/unit/`, `integration/` and `system/`. Preserve prior runs; do not use tier READMEs as monolithic evidence logs. Add/update the manual checklist with URL, prerequisites, actor/organization, steps and expected results.

Keep current status, decisions and blockers in the temporary working contract. Update affected architecture/schema/API/diagram documentation in its own location only when the implementation changes those technical contracts; do not embed it in feature READMEs. Do not rewrite unaffected sprint allocations or historical evidence. For documentation/customization-only changes, use syntax, reference and workflow checks; do not invent product test runs or require unrelated application suites.

**Exit:** all required checks have actual results, affected technical docs/evidence are updated, and readiness for the final feature documentation update versus Blocked/Failed is determined honestly.

## 7. Report Delivery

After implementation and all required verification pass, update only the affected sections of the owning feature README. Preserve existing IDs/anchors and confirmed scope. Summarize the delivered outcome, actors/eligibility, meaningful inputs and validation, business rules/state transitions, user-visible error behavior and relevant limitations, only where applicable. Distinguish implemented behavior from any remaining confirmed target scope; do not imply the whole requirement is complete when only an approved slice is delivered. Publish newly approved function definitions and update index links/counts only when needed.

Keep this update concise and feature-focused. Do not copy the temporary brief, inventory, interview/approval history, implementation plan, test cases/matrices/commands/results, manual test checklist or architecture/schema design into the README. Use links to dedicated testing or technical documents only when useful; do not duplicate their contents. Do not bulk-clean unrelated feature documentation.

If implementation or required verification is Failed/Blocked/Not Run, keep the working contract in session storage for resumption and report partial progress without publishing completion documentation. For an already-implemented request, publish only necessary factual corrections after the agreed verification; a no-op README update is not required.

Provide a concise overview of delivered behavior/IDs, key changed files, approved scope covered and DoD status. List verification results with evidence links, actual URL where relevant, the manual checklist and remaining limitations/blockers. Distinguish locally verified behavior from production readiness.

Only mark Complete when every required DoD criterion is satisfied. Otherwise report what is implemented, what remains Failed/Blocked/Not Run and the next action. A screenshot, a mock success state or a historical passing test does not establish new feature completion.

After successful publication and reporting, remove only this task's temporary working-contract file. Preserve durable feature documentation and test evidence; never delete the session directory or other tasks' files. Retain the brief for paused, blocked or documentation-only planning work and report its path.

## Workflow Rehearsal Cases

These are expected behaviors for validating this customization, not claims of application test execution. Rehearse with read-only/temporary examples; do not implement arbitrary product features just to test the agent.

| Input / condition | Expected next action |
| --- | --- |
| Existing `REQ-001-F02` request | Resolve the Role catalog definition, retain ID/anchor, inspect current code and record only evidenced gaps in a temporary contract; ask only unresolved decisions. |
| Requested behavior already exists | Propose focused verification; preserve implementation and avoid unnecessary code or README edits. |
| Partially implemented or unverified behavior | Reuse the working parts; investigate unknowns rather than treating them as missing, and plan only the evidenced delta. |
| Ambiguous feature name | Ask one single-choice target-selection question; no implementation. |
| Missing specification | Draft Proposed in temporary session storage, identify the intended domain and check active/retired IDs; leave feature READMEs unchanged. |
| Scope answer received | Save it into the temporary working contract before the next single-choice question; cover all four required topics. |
| Skipped/deferred blocking answer | Keep blocked or ask about a narrower scope; do not choose the recommended answer automatically. |
| Revision or documentation-only decision | Return to clarification or stop at documents; no source/test/config edits. |
| Explicit approval of current revision | Implement that slice, not all related functions. |
| Material change or new session without approval evidence | Invalidate/reconfirm approval before implementation. |
| Backend-only change | Relevant backend/API/integration gates; no fabricated browser test. |
| UI change | Playwright assertions/visual inspection and real outcomes; record evidence and manual steps. |
| Browser/Docker missing or test failing | Blocked/Failed with exact check and next action; never Complete. |
| Implementation and required checks complete | Publish concise feature outcomes/rules in the owning README, keep tests/architecture separate and remove only the completed task's temporary brief. |
| Paused or blocked work | Retain the temporary brief and report its path; do not publish completion documentation. |