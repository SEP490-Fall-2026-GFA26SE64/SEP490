# Organization Onboarding

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 3.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. Statuses follow the [implementation legend](../README.md#current-implementation-overview); this is not a new runtime acceptance result.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-01.01](#fr-01-01) | API-backed slice | Guest organization/contact/admin details and password are submitted to registration APIs. Saved registrations support email-code verification/resend, administrator authenticator enrollment, recovery codes and sign-in to resume. | Initial form steps are not a persisted registration until account creation succeeds. Cryptographic configuration remains required; SMTP is required when email verification is enabled. Live inbox delivery is not established by this inspection. |
| [FR-01.04](#fr-01-04) | API-backed slice | Guest pages read registration, order/payment and workspace setup state. A completed, paid/provisioned registration can establish a workspace session and enter the administrator area at `/workspace/{slug}/admin/subscription`. | Payment confirmation and setup completion are separate states; a checkout redirect is not proof of either. Provider/setup failures must still be resolved before workspace entry. |
| [FR-07.03](#fr-07-03) | API-backed slice | Durable payment application creates the organization workspace, initial administrator membership and paid subscription period, with processing/retry state in PostgreSQL. An organization structure imported during registration is created in the new organization before the workspace becomes ready. | This establishes workspace identity, billing and an optional initial organization structure, not a department lifecycle or all Version 2 workflows in the new organization. |

**Entry points:** `/register`, `/guest/register`, `/guest/resume`, `/guest/onboarding-status`; subsequent purchase is described in [Subscription lifecycle](../Subscription%20lifecycle/README.md#current-implementation).

**Local/dev integration options (2026-10-30):** operators can independently disable email verification, MFA and payOS through default-on environment switches. Guests skip only disabled steps; ordinary passwords, account/membership authorization and workspace eligibility remain required. Skipped verification never invents email proof or MFA assurance, and reenabling requires missing actual proof, including existing bypass sessions. A development payment bypass can provision the selected workspace/subscription without claiming payment; its status remains visibly not paid. Disabled options are refused outside local/dev and in production. This does not certify external delivery or the remaining learning workspace. See [environment options](../../../.env.example) and [dated evidence](../../testing/system/REQ-060-061-028-integration-flags-20261030.md).

**Organization workspaces (2026-11-02):** every organization is served under its own address, `/workspace/{slug}/...`, where the slug is the one reserved at registration. Members sign in at `/login` and land on their role home inside their own workspace; older links such as `/admin/...` or `/employee/...` are redirected there. Opening another organization's or an unknown workspace shows a generic "Workspace not found" page without loading any of its data, and a signed-out deep link returns to the same workspace after sign-in. After payment is applied, an imported organization structure (previously: a selected starter catalog) is created with organization-specific identifiers; the workspace becomes ready only when this succeeds, and repeated failures mark setup as failed. See [historical workspace evidence](../../testing/system/REQ-060-061-multi-org-workspace-20261102.md).

**Starter catalog (2026-11-12, local scope; superseded 2026-11-18 by the organization structure import below):** registration step 1 offers an optional large selection dialog with guided Job position -> Target role -> Level -> Competency/Micro-skill exploration, search/context filters, graph inspection and a selected-items panel. All five types are selectable; learning modules and certificates are neither selectable nor copied. Adding a parent initially chooses its branch, which the Guest may prune without the retained parent restoring removed descendants. Required structural ancestors and transitive prerequisites are added with visible reasons; a still-required prerequisite cannot be removed individually. Apply updates the form, while Cancel/close discards the dialog draft. Filtering does not change choices; additional results remain reachable and an oversized addition is rejected visibly rather than partially applied. At most 300 explicit items may be chosen, with required dependencies counted separately; no selection starts an empty catalog. Progress becomes durable after account creation, not before. Preview failures prevent applying a nonempty draft and offer retry. This development-only change does not migrate old unfinished selections or alter existing organization catalogs. [Verification and manual checks](../../testing/system/REQ-060-061-starter-catalog-20261112.md).

**Organization structure import (2026-11-18, local scope):** instead of copying platform catalog items, the Guest may import the company's own structure in registration step 1 from an Excel workbook (`.xlsx` only; flat sheets and CSV are no longer accepted). The downloadable template has an Instructions tab and four data tabs: Departments (code, name, description), Job positions (department code, code, name), Target roles (job position code, code, name, scope) and Levels (target role code, level name, level rank). Each reference column offers a dropdown of the codes already entered in the previous tab, with the matching name shown automatically beside it. While typing, Excel also rejects duplicate codes, unknown references, over-long text, and invalid or repeated level names and ranks. English or Vietnamese tab and header names are accepted; files are limited to 1 MB and 500 data rows per tab.

- Codes are case-insensitive and unique within their tab. Every reference must name an existing code in the previous tab.
- Every department needs at least one job position, every job position at least one target role, and every target role at least one level.
- Level names are free text; the rank is a whole number from 1 to 99. Level names and ranks are unique within a target role. Level codes are generated from the rank.
- The upload is checked again on the server. Any problem rejects the whole workbook; the dialog lists each tab, row, column and reason, and nothing is applied.
- The import dialog opens at full size with upload and template-download actions. Instructions are in the workbook, not the dialog. Before any upload it shows zero counts, an empty list and a graph containing only the organization root. A valid file shows counts, a searchable collapsible tree, a graph and item details. In the review only, the graph adds a symbolic "My organization" root above the departments and shows levels with the same name (case-insensitive) as one node linked to every target role that uses it; its details list each role's rank, and the level count shows distinct level names. The saved structure still keeps one level per target role and does not include the root. Apply updates the form; Cancel keeps the previous choice; Remove clears it. No import starts an empty structure.
- The structure is checked again and saved when the account is created, then created in the organization's knowledge graph after payment. Optional details not in the file, such as department heads, competencies and skills, are left empty for later administration.

Limitations: development-only change; unfinished registrations made with the old starter catalog provision an empty structure; existing organization catalogs are unchanged. [Verification and manual checks](../../testing/system/REQ-060-org-structure-import-20261118.md).

**Code references:** [registration page](../../../frontend/src/features/guest/GuestRegisterPage.tsx), [structure import dialog](../../../frontend/src/features/guest/GuestOrgStructureImport.tsx), [structure validation](../../../backend/src/main/java/com/adaptlearngraph/services/OrganizationStructureImporter.java), [workspace routing](../../../frontend/src/features/subscription/WorkspaceBoundary.tsx), [structure provisioning](../../../backend/src/main/java/com/adaptlearngraph/services/WorkspaceCatalogImportWorker.java), [registration service](../../../backend/src/main/java/com/adaptlearngraph/services/RegistrationService.java), [setup page](../../../frontend/src/features/guest/WorkspaceProvisioningPage.tsx), [workspace-session handoff](../../../backend/src/main/java/com/adaptlearngraph/apis/RegistrationWorkspaceEntryController.java), [payment application and provisioning](../../../backend/src/main/java/com/adaptlearngraph/repository/JdbcPaymentProcessingStore.java). Existing verification is indexed in the [testing guide](../../testing/README.md).

**Starter catalog interaction refinement (2026-11-12, local scope; superseded 2026-11-18):** Guest graph nodes show names without codes, distinguish the five types by shape with a legend, and mark catalog membership separately from inspection focus. Moving around or inspecting nodes no longer automatically refits the view; an explicit Fit control remains available. Edges temporarily hide during mouse drag/zoom. Your catalog organizes items into collapsible type groups with counts while retaining required-item explanations and removal rules. Code search remains available. [Verification and manual checklist](../../testing/system/REQ-060-catalog-refinement-20261112.md).

## Requirements

<a id="fr-01-01"></a>

### FR-01.01: Register an organization

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.01 |
| 2. Requirement Name | Register an organization |
| 3. Description | The Guest shall submit organization and contact details, optionally import and preview its organization structure, create an administrator account, verify the account email, and resume an incomplete registration with the saved structure. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-01-04"></a>

### FR-01.04: Track onboarding and access the workspace

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-01.04 |
| 2. Requirement Name | Track onboarding and access the workspace |
| 3. Description | The Guest shall view registration, payment, and workspace setup status and access the organization workspace. |
| 4. Actor | Guest |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-03"></a>

### FR-07.03: Provision organization workspaces

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.03 |
| 2. Requirement Name | Provision organization workspaces |
| 3. Description | The System shall create organization workspaces, activate subscriptions, and assign the initial System Administrator. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-060"></a>REQ-060 | [FR-01.01](#fr-01-01); [FR-01.04](#fr-01-04) |
| <a id="req-060-f01"></a>REQ-060-F01 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f02"></a>REQ-060-F02 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f03"></a>REQ-060-F03 | [FR-01.01](#fr-01-01) |
| <a id="req-060-f04"></a>REQ-060-F04 | [FR-01.04](#fr-01-04) |
| <a id="req-061"></a>REQ-061 | [FR-07.03](#fr-07-03) |
| <a id="req-061-f01"></a>REQ-061-F01 | [FR-07.03](#fr-07-03) |
| <a id="req-061-f02"></a>REQ-061-F02 | Related to [FR-07.03](#fr-07-03); recovery is a supporting concern under section 3.2(d), not a separate functional requirement. |

## Historical Links

<a id="implementation-brief-registration-first"></a>
<a id="implementation-results-2026-10-21"></a>
<a id="public-landing-and-guest-entry-revision-13"></a>

Older documents link here for implementation briefs or delivery records that are no longer part of this functional-requirements catalog. These compatibility anchors do not reproduce or reconfirm those designs, approvals or completion claims. Consult the dated [testing guides and evidence](../../testing/README.md) for recorded verification; the source-level requirements above do not certify runtime behavior.
