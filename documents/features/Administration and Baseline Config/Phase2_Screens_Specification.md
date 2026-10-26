# Phase 2 Screens Specification: Organization Administration & L&D Baseline Configuration

> Status note (2026-10-20): the administration/billing material and the baseline screen implementation inventory below are historical. The current REQ-002 target is the adaptive contract in [Configure Baseline Assessment](../Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md). This file is not an implementation contract for the adaptive redesign.

## 1. Overview & Architectural Scope Alignment

Phase 2 introduces the complete operational infrastructure for **Tenant System Administrators** and **L&D Managers**, fulfilling the multi-tenant SaaS organizational structure, subscription billing management, and diagnostic baseline assessment configuration as specified in the Capstone Architecture and Proposal.

All screens strictly follow the **UI-UX Pro Max** standard:
- CSS variables from `tokens.css` with zero hardcoded hex codes
- Surface elevation with clean card backgrounds over subtle canvas
- Standard typography scale (`--text-page`, `--text-section`, `--text-card`, `--text-body`, `--text-caption`)
- Snug modern density with anchored controls and responsive table grids
- Reusable shared components (`<PageHeader>`, `<StatCard>`, `<Card>`, `<Button>`, `<Badge>`, `<Input>`, `<Dialog>`)

---

## 2. Implemented Screens & Feature Breakdown

### Screen 1: Departments & Organizational Units Management (`/admin/departments`)
- **Actor:** System Administrator
- **Path:** [frontend/src/features/administration/departments/DepartmentsManagementPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/administration/departments/DepartmentsManagementPage.tsx)
- **Store:** [frontend/src/shared/stores/departmentStore.ts](file:///d:/Code/Capstone/SEP490/frontend/src/shared/stores/departmentStore.ts)
- **Key Capabilities:**
  - **Standardized Table Card Design:** Harmonized with User Accounts (`/admin/users`) and other actor management tables with standard `<CardHeader>`, `<CardTitle>` with `<Building2 />`, `<CardDescription>`, snug density (`py-2.5 px-3` headers, `py-3 px-3` cells), and summary pagination footer.
  - **Department KPI Telemetry:** Total active departments, total assigned workforce, cumulative capacity quota, and leadership assignments.
  - **CRUD Operations:** Create/Edit department with code, title, description, department head name & email, target headcount limit, and linked O*NET occupation codes.
  - **Direct Roster Assignment & Management:** Dedicated Roster column (`1 + N` avatar pill design) opening an interactive modal with direct `+ Assign Member` drawer to search and assign company users in 1 click, as well as `Reassign` and `Remove` actions.
  - **Safe Deletion Protection:** Enforces member re-assignment or empty department validation before allowing deletion.

### Screen 2: Organization Settings & Technical Policy Engine (`/admin/organization-settings`)
- **Actor:** System Administrator
- **Path:** [frontend/src/features/administration/settings/OrganizationSettingsPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/administration/settings/OrganizationSettingsPage.tsx)
- **Key Capabilities:**
  - **Tab 1: Profile & S3/MinIO Storage Configuration:** Organization legal name, tenant domain, contact email, MinIO S3 bucket name (`alg-storage-tenant`), storage quota progress bar, and regional endpoint.
  - **Tab 2: Access, Security & Tenant Isolation:** Single Sign-On (Google Workspace SAML 2.0 / Okta OIDC toggle), session timeout duration (15 to 480 minutes), password policy enforcement, and multi-factor authentication (MFA).
  - **Tab 3: Knowledge Tracing & Adaptive Parameters:** Default mastery threshold percentage (50% to 95%), BKT guess/slip priors, and conditional recalculation trigger sensitivities.
  - **Tab 4: Email Notifications & Alerting:** Tenant-wide toggles for assessment reminders, weekly manager digests, and assigned Expert question shortage alerts.

### Screen 3: Subscription & Billing Management (`/admin/subscription`)
- **Actor:** System Administrator
- **Path:** [frontend/src/features/administration/subscription/OrganizationSubscriptionPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/administration/subscription/OrganizationSubscriptionPage.tsx)
- **Key Capabilities:**
  - **Current Plan Status:** Visualizes active tier badge (Starter / Growth / Enterprise), billing cycle (Monthly / Annual), renewal date, and seat utilization bar.
  - **Invoice & Payment History:** Historical billing ledger with transaction references, timestamps, amounts, PayOS status tags, and printable receipt generation simulation.
  - **Upgrade / Renewal Flow:** Interactive plan selection modal linking to PayOS VietQR payment flow.
  - **Cancellation Safety Dialog:** Safeguards accidental downgrades or tenant data lockouts.

### Screen 4: Baseline Assessment Configuration (`/ld-manager/baseline-config`)
- **Actor:** L&D Manager (in alignment with REQ-002-F02 specifications)
- **Path:** [frontend/src/features/manager/baseline-config/BaselineAssessmentConfigPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/manager/baseline-config/BaselineAssessmentConfigPage.tsx)
- **Current target capabilities (not implemented):**
  - Select an authorized Occupation and edit one working adaptive Blueprint.
  - Configure required maximum/time pairs for exploration and each active role; each maximum is server-validated against the current deduplicated eligible item capacity.
  - In each row, configure server time through synchronized total-duration and seconds-per-question controls. Initial suggestion is 60 seconds per question; editing either control recalculates the other, while only that row's final total duration persists and no backend default fills a blank value.
  - Show active-role, MicroSkill, eligible-item and IRT-parameter coverage without score-weight controls; omit draft/inactive/archived/removed roles.
  - **Test Blueprint:** answer-safe ephemeral validation/preview with no stored assessment or attempt.
  - Finalize an immutable version and atomically make it current, without Review/Publish.
  - Reuse established shared components, button variants, responsive layout and EN/VI patterns.

---

## 3. Navigation & Routing Integration

The following routes are registered in `frontend/src/app/App.tsx` and navbar items in `frontend/src/shared/layouts/WorkspaceLayout.tsx`:

| Actor | Route | Navigation Tab | Icon |
| :--- | :--- | :--- | :--- |
| **System Admin** | `/admin/departments` | Departments | `<Building2 size={15} />` |
| **System Admin** | `/admin/organization-settings` | Org Settings | `<Settings size={15} />` |
| **System Admin** | `/admin/subscription` | Subscription | `<CreditCard size={15} />` |
| **L&D Manager** | `/ld-manager/baseline-config` | Baseline Config | `<Sliders size={15} />` |

---

## 4. Verification & Testing

- **TypeScript Compilation:** `npm run build` completed with 0 errors across all 2,035 modules.
- **Unit Testing:** `npx vitest run` passed (8 test files, 30/30 tests passed).
- **Git Hygiene:** `FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_1.docx.md` confirmed excluded from git tracking.
