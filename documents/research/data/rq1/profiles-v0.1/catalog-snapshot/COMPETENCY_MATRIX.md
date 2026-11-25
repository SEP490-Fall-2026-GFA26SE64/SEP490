# Application Developer competency matrix

Local research proposal; no official occupational equivalence. F = FOUNDATION; I = INTERMEDIATE; A = ADVANCED. Each letter is an explicit requirement, not an implicit hierarchy.

| Skill | Focus | Junior | Middle | Senior |
|---|---|---|---|---|
| MS-CORE01 | Executable business logic | F | F, I | F, I, A |
| MS-CORE02 | Version-controlled collaboration | F | F, I | F, I |
| MS-CORE03 | Verifiable software requirements | F | F, I | F, I, A |
| MS-CORE04 | Controlled application release | F | F, I | F, I |
| MS-FS01 | User interaction design | F | F, I | F, I |
| MS-FS02 | Accessible web interaction | F | F, I | F, I |
| MS-FS03 | Application API contracts | F | F, I | F, I, A |
| MS-FS04 | Relational data queries | F | F, I | F, I |
| MS-FS05 | Component integration | F | F, I | F, I, A |
| MS-FS06 | Systematic defect diagnosis | F | F, I | F, I, A |
| MS-FS07 | Automated unit verification | F | F, I | F, I, A |
| MS-FS08 | Code review decisions | Not required | I | I, A |
| MS-FS09 | Responsive interface layout | F | F, I | F, I |
| MS-FS10 | Semantic HTML structure | F | F | F |
| MS-FS11 | Asynchronous browser requests | F | F, I | F, I |
| MS-FS12 | Application input validation | F | F, I | F, I, A |
| MS-FS13 | Resource authorization | F | F, I | F, I, A |
| MS-FS14 | Atomic data updates | F | F, I | F, I, A |
| MS-FS15 | Behavior-preserving restructuring | Not required | I | I, A |
| MS-FS16 | Continuous integration workflows | F | F, I | F, I, A |

## Knowledge outcomes

### MS-CORE01 — Implement programs and scripts

Write and check executable logic for a specified software or automation task.

- FOUNDATION: Trace branching and collection operations for a small order calculator; Identify boundary inputs and explain the expected result
- INTERMEDIATE: Implement decomposed pricing logic with explicit error handling; Verify empty, invalid and boundary cases without changing the stated rules
- ADVANCED: Evaluate alternative implementations under changing discount policies; Justify complexity and maintainability trade-offs using failure cases

### MS-CORE02 — Manage source changes with version control

Record and review source changes so a tested version can be identified and recovered.

- FOUNDATION: Explain commits, branches and working-tree changes; Recover a mistaken local edit without losing unrelated work
- INTERMEDIATE: Resolve a conflicting feature change while preserving both intended behaviors; Prepare a reviewable history and identify the tested revision
- ADVANCED: Design a branching and hotfix strategy for concurrent releases; Evaluate rollback and traceability risks across maintained versions

### MS-CORE03 — Translate requirements into verifiable changes

Connect a stated user or service need to a bounded implementation and explicit checks.

- FOUNDATION: Identify actors, inputs and outputs in a small user request; Write observable acceptance examples including one failure case
- INTERMEDIATE: Resolve ambiguities in a multi-step user workflow; Define testable business rules and boundaries before implementation
- ADVANCED: Reconcile conflicting functional and quality constraints; Prioritize a bounded release with traceable acceptance and explicit residual risk

### MS-CORE04 — Deploy a controlled software release

Apply an agreed deployment procedure and verify the released service and rollback path.

- FOUNDATION: Explain configuration, artifact and health-check roles in a release; Identify the rollback point in a supplied deployment procedure
- INTERMEDIATE: Plan a reproducible application rollout with environment-specific configuration; Verify service health and define rollback triggers
- ADVANCED: Evaluate staged rollout alternatives under migration and availability constraints; Specify evidence for safe rollback when versions coexist

### MS-FS01 — design user interface

Specify user interface structure and interactions for a user task.

- FOUNDATION: Identify interface states and navigation for a simple user task; Explain the purpose of clear labels and actionable feedback
- INTERMEDIATE: Specify interaction states for an interrupted multi-step task; Resolve navigation and error-recovery ambiguities with a flow model
- ADVANCED: Compare interaction alternatives for conflicting user needs; Justify recovery and consistency decisions across complex workflows

### MS-FS02 — Implement accessible user interfaces

Implement interfaces that support keyboard and assistive technology use.

- FOUNDATION: Explain semantic controls, accessible names and keyboard order; Identify inaccessible interactions in a small form
- INTERMEDIATE: Specify keyboard and focus behavior for a dialog and validation flow; Check accessible names and dynamic feedback against observable criteria
- ADVANCED: Evaluate accessibility trade-offs in a complex interactive widget; Design a verification strategy across input methods and assistive use

### MS-FS03 — design application interfaces

Define interfaces through which application components exchange information.

- FOUNDATION: Explain request, response and error conventions for a resource API; Select suitable operations and response meanings for basic CRUD
- INTERMEDIATE: Specify pagination, validation and repeat-request behavior for an API; Check examples for consistent success and failure contracts
- ADVANCED: Evaluate versioning and compatibility strategies for changing consumers; Justify idempotency and failure semantics under partial completion

### MS-FS04 — use query languages

Retrieve and manipulate data using a query language.

- FOUNDATION: Explain filtering, joining and aggregation on related tables; Predict the result of a query with missing or duplicate rows
- INTERMEDIATE: Construct queries for grouped business reports with explicit null handling; Check result correctness against a small reference dataset
- ADVANCED: Compare equivalent query formulations under skewed data and access constraints; Justify an optimization while preserving result semantics

### MS-FS05 — integrate system components

Connect components and verify their combined behaviour.

- FOUNDATION: Identify producer, consumer and exchanged data in an integration; Explain how a failed dependency affects a user operation
- INTERMEDIATE: Specify component coordination with timeouts and partial-failure handling; Define contract and integration checks for the combined workflow
- ADVANCED: Evaluate recovery strategies for repeated or out-of-order messages; Justify consistency and coupling trade-offs across service boundaries

### MS-FS06 — debug software

Locate and correct causes of software defects.

- FOUNDATION: Reproduce a defect from a bounded input and observed output; Distinguish symptoms from a testable causal hypothesis
- INTERMEDIATE: Trace a failure across UI, API and persistence boundaries; Verify the smallest justified correction with a regression case
- ADVANCED: Evaluate competing explanations for an intermittent production-like fault; Design discriminating observations and validate a fix under recurrence conditions

### MS-FS07 — perform software unit testing

Verify individual units of software with repeatable automated checks.

- FOUNDATION: Explain assertions, test isolation and boundary cases; Identify useful tests for a pure validation function
- INTERMEDIATE: Design deterministic unit tests around service collaborators; Verify error behavior without coupling tests to private implementation details
- ADVANCED: Evaluate a unit-test suite for blind spots and brittle doubles; Select high-value cases for complex state transitions and mutation risks

### MS-FS08 — conduct ICT code review

Review source changes and give actionable technical feedback.

- FOUNDATION: Distinguish correctness defects from style preferences in a patch; Write actionable feedback tied to an observable risk
- INTERMEDIATE: Review a feature diff for boundary behavior, tests and maintainability; Prioritize blocking findings and explain suggested corrections
- ADVANCED: Evaluate cross-cutting design and security risks in a large change; Justify review decisions with evidence and proportionate verification

### MS-FS09 — Implement responsive layouts

Adapt layout and content to different viewport sizes.

- FOUNDATION: Explain flexible sizing, flow and viewport-dependent layout; Identify overflow causes in a simple page
- INTERMEDIATE: Specify a responsive layout across narrow and wide viewports; Preserve content order and usable controls with long text and tables
- ADVANCED: Evaluate layout strategies for dense data and localization constraints; Define checks for content loss, reflow and interaction stability

### MS-FS10 — Use semantic HTML

Choose elements whose meaning matches the content and interaction.

- FOUNDATION: Choose elements matching headings, navigation and form intent; Explain the difference between a link and an action control
- INTERMEDIATE: Structure a complex document and form with meaningful relationships; Validate labels, groups and native interaction semantics
- ADVANCED: Evaluate competing markup structures for reusable components; Justify native-element choices and semantic constraints during composition

### MS-FS11 — Handle asynchronous web requests

Handle successful responses, HTTP failures and request cancellation in the interface.

- FOUNDATION: Explain pending, success and failure states of a browser request; Distinguish HTTP failure from a successful empty response
- INTERMEDIATE: Handle cancellation and stale responses in an interactive search; Specify consistent loading, empty and retry states
- ADVANCED: Evaluate coordination strategies for overlapping browser operations; Justify freshness and recovery rules under races and intermittent connectivity

### MS-FS12 — Validate application inputs

Enforce input constraints and provide usable validation feedback on client and server.

- FOUNDATION: Distinguish required, malformed and out-of-range input; Explain why client checks do not replace server validation
- INTERMEDIATE: Specify consistent validation and feedback at request boundaries; Check nested, missing and adversarial input without trusting the client
- ADVANCED: Evaluate validation policy across multiple entry points and schema versions; Justify canonicalization and compatibility decisions against ambiguous input

### MS-FS13 — Enforce application authorization

Check permissions for protected actions and resources.

- FOUNDATION: Distinguish authentication from permission to act on a resource; Identify missing ownership checks in a simple access scenario
- INTERMEDIATE: Specify trusted actor, organization and resource checks for protected operations; Verify allowed and denied cases including cross-organization access
- ADVANCED: Evaluate authorization consistency across delegated and asynchronous actions; Justify policy decisions under stale grants and concurrent changes

### MS-FS14 — Use database transactions

Commit related updates atomically and roll back unsuccessful operations.

- FOUNDATION: Explain commit and rollback for related database changes; Identify a partial-update failure that violates a business invariant
- INTERMEDIATE: Define transaction boundaries for a concurrent reservation; Check rollback and competing updates against a stated invariant
- ADVANCED: Evaluate isolation, lock and retry alternatives under contention; Justify correctness and throughput trade-offs for overlapping transactions

### MS-FS15 — Improve existing software structure

Revise existing implementation while checking that required behaviour is preserved.

- FOUNDATION: Identify duplication and mixed responsibilities in a small function; Explain how characterization checks protect existing behavior
- INTERMEDIATE: Plan incremental restructuring of a coupled service; Preserve public behavior with focused regression checks
- ADVANCED: Evaluate alternative decompositions for a legacy subsystem; Justify migration steps and compatibility checks under ongoing change

### MS-FS16 — Configure continuous integration

Run build and test steps automatically when code changes.

- FOUNDATION: Explain triggers, jobs and build-test artifacts in a pipeline; Identify how a failing check blocks an unsafe merge
- INTERMEDIATE: Specify a reproducible build and test workflow for a web application; Handle dependency setup and diagnostic artifacts on failure
- ADVANCED: Evaluate pipeline isolation, caching and parallelization trade-offs; Justify reliable checks under untrusted changes and constrained runners
