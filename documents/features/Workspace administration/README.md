# Workspace Administration and Access

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 5.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview); the existing approved identity policy below is preserved.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-03.01](#fr-03-01) | API-backed slice | System Administrators list/filter members and pending activations, create/resend activation invitations, edit member name/role/department/occupation and activate/deactivate memberships. Invitees set their own password through a single-use activation flow. | No account hard-delete operation is implied. Department/occupation choices use stored references, not the browser department editor. External activation-email delivery remains environment-dependent. |
| [FR-03.03](#fr-03-03) | Partial | Member administration assigns one organization-side role and changes membership access with seat/revision checks and last-administrator safeguards. The current policy allows exactly one role per account. | There is no general editable permission matrix. Catalog authorization still uses legacy/local actor mechanisms rather than complete trusted occupation/Expert assignment enforcement. |
| [FR-03.04](#fr-03-04) | Prototype | Organization settings edit company name/contact and browser-stored workspace options. | These changes do not update the backend organization profile or enforce the displayed session, MFA, scoring or notification settings. |
| [FR-03.05](#fr-03-05) | Prototype | The administrator dashboard displays a sample audit list. | It does not retrieve the backend audit store or aggregate actual role/content/publication/assessment/pathway events. |
| [FR-07.01](#fr-07-01) | Partial | Real password authentication, current-session lookup, sign-out, Organization Administrator MFA/recovery, member activation and role-specific route entry exist. Identity/billing operations check authenticated principals and access state. | This is not complete authorization for every feature API: local catalog access/configured Employee identity and client actor/company inputs remain. Prototype pages inside a protected layout are not thereby production-authorized workflows. |

**Member inputs/rules:** full name, email and a single role are used when inviting a member; Employee department and occupation are required and the occupation must belong to the selected organization department. Existing historical references and legitimate nulls for other roles are handled separately. Updates carry a revision, and Employee admission observes subscription seats. The API's role-array shape does not permit multiple account roles.

**Entry points:** `/login`, `/activate` (also `/active`), `/admin/users`, `/admin/organization-settings`, `/admin/dashboard`. Login and activation use the same illustrated authentication layout; activation retains its own validation and single-use proof flow. The alias preserves incoming proof fragments. The old `/ld-manager/users` route redirects to administrator user management; it does not grant L&D Managers account-management permission.

**Code references:** [real user directory](../../../frontend/src/features/administration/user-management/UserManagementPage.tsx), [authentication service](../../../backend/src/main/java/com/adaptlearngraph/identity/application/WorkspaceAuthenticationService.java), [activation adapter](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/JdbcMemberActivationAdapter.java), [assignment validation](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/JdbcMemberReferenceValidator.java), [settings prototype](../../../frontend/src/features/administration/settings/OrganizationSettingsPage.tsx), [dashboard prototype](../../../frontend/src/features/administration/dashboard/AdminDashboardPage.tsx), [local catalog boundary](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/LocalCatalogSecurityConfiguration.java).

## Requirements

<a id="fr-03-01"></a>

### FR-03.01: Manage user accounts

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.01 |
| 2. Requirement Name | Manage user accounts |
| 3. Description | The System Administrator shall create, view, and update user accounts and activate or deactivate organization memberships. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-03-03"></a>

### FR-03.03: Manage roles and permissions

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.03 |
| 2. Requirement Name | Manage roles and permissions |
| 3. Description | The System Administrator shall assign or remove organization-side roles and manage workspace access permissions. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-03-04"></a>

### FR-03.04: Manage system configuration

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.04 |
| 2. Requirement Name | Manage system configuration |
| 3. Description | The System Administrator shall view and update organization profile details and workspace settings. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-03-05"></a>

### FR-03.05: Monitor system activity

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.05 |
| 2. Requirement Name | Monitor system activity |
| 3. Description | The System Administrator shall view workspace activity and audit records, including role and content changes, approvals, publications, assessment submissions, and pathway reviews. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-01"></a>

### FR-07.01: Authenticate users and authorize access

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.01 |
| 2. Requirement Name | Authenticate users and authorize access |
| 3. Description | The System shall authenticate users, manage sign-in sessions, and authorize access to platform and organization functions. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Implemented Policy Reference

The separately approved [single-role identity policy](../../ARCHITECTURE.md#single-role-identity-and-platform-seed-2026-10-28) implements a bounded portion of FR-03.01/03.03/07.01: one role per account, password-only seeded Platform Admin, preserved Organization Admin MFA, and activated Expert/L&D/Employee entry into their corresponding layouts without MFA. Account edits retain authorization, seat, assignment and history safeguards. The source-only requirement records above remain unchanged; [verification and manual checks](../../testing/system/REQ-037-single-role-activation.md) define the delivered local scope, not completion of the entire domain.

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-022"></a>REQ-022 | [FR-03.01](#fr-03-01); [FR-03.03](#fr-03-03) |
| <a id="req-022-f01"></a>REQ-022-F01 | [FR-03.01](#fr-03-01) |
| <a id="req-022-f02"></a>REQ-022-F02 | [FR-03.01](#fr-03-01) |
| <a id="req-022-f03"></a>REQ-022-F03 | [FR-03.01](#fr-03-01) |
| <a id="req-022-f05"></a>REQ-022-F05 | [FR-03.03](#fr-03-03) |
| <a id="req-022-f06"></a>REQ-022-F06 | [FR-03.01](#fr-03-01) |
| <a id="req-022-f07"></a>REQ-022-F07 | [FR-03.03](#fr-03-03) |
| <a id="req-022-f08"></a>REQ-022-F08 | [FR-03.03](#fr-03-03) |
| <a id="req-037"></a>REQ-037 | [FR-07.01](#fr-07-01) |
| <a id="req-037-f01"></a>REQ-037-F01 | [FR-07.01](#fr-07-01) |
| <a id="req-037-f02"></a>REQ-037-F02 | [FR-07.01](#fr-07-01) |
| <a id="req-040"></a>REQ-040 | Supporting security concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
| <a id="req-040-f01"></a>REQ-040-F01 | Supporting security concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
| <a id="req-040-f02"></a>REQ-040-F02 | Supporting security concern under [Version 2, section 3.2(d)](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); not a standalone functional requirement. |
| <a id="req-057"></a>REQ-057 | [FR-03.04](#fr-03-04) |
| <a id="req-057-f01"></a>REQ-057-F01 | [FR-03.04](#fr-03-04) |
| <a id="req-057-f02"></a>REQ-057-F02 | [FR-03.04](#fr-03-04) |
| <a id="req-058"></a>REQ-058 | [FR-03.05](#fr-03-05) |
| <a id="req-058-f01"></a>REQ-058-F01 | [FR-03.05](#fr-03-05) |
| <a id="req-058-f02"></a>REQ-058-F02 | [FR-03.05](#fr-03-05) |

## Historical Links

<a id="implementation-brief-req-037-f01-login-appearance-restoration"></a>

Older documents link here for implementation briefs or delivery records that are no longer part of this functional-requirements catalog. These compatibility anchors do not reproduce or reconfirm those designs, approvals or completion claims. Consult the dated [testing guides and evidence](../../testing/README.md) for recorded verification; the source-level requirements above do not certify runtime behavior.

## Local development identities

The opt-in [local account tooling](../../../tools/dev-accounts/README.md) supplies five separate role identities for development on an isolated current-schema database. This is fixture support, not a registration policy change: Platform Administrator is organization-free, company members retain exactly one role, and Organization Administrator still enrolls MFA through the normal login page. No default production password or public bootstrap endpoint is added.
