# Phase 1: Guest Onboarding & Platform Administrator Screens Specification

**Document Reference:** Capstone Project Register [FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_1.docx.md](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_1.docx.md)  
**Implementation Date:** 2026-10-17  
**Scope:** Actor 1 (Guest) and Actor 2 (Platform Administrator)

---

## 1. Actor Overview & Responsibilities

### Actor 1: Guest
The Guest is an unauthenticated external visitor or prospective customer representing an organization. They undergo self-service registration, subscription plan selection, payOS checkout payment with signature verification, and automated workspace provisioning.

### Actor 2: Platform Administrator
The Platform Administrator is the super-administrator overseeing the entire multi-tenant platform. They manage all registered organization workspaces (suspending or reactivating tenant access), configure global subscription plans and pricing (in USD and VND) with seat quotas, and monitor cross-organization health, error rates, and audit logs.

---

## 2. Implemented Screens (Phase 1)

### Group A: Guest Self-Service Onboarding & Subscription
1. **Organization Registration Page** (`/guest/register` and `/register`)
   - **Path:** `frontend/src/features/guest/GuestRegisterPage.tsx`
   - **Inputs:** Organization Legal Name, Workspace URL slug (`subdomain.adaptlearn.io`), Industry / Domain, Headcount tier, Administrator Full Name, Work Email, Password, Password Confirmation.
   - **Features:**
     - Automatic URL slug generation from organization name.
     - 6-digit email verification security modal simulation with demo auto-fill.
     - Incomplete draft recovery from localStorage (`adaptlearn_guest_registration_draft`).
     - Input validation and password matching.
     - Direct routing to Subscription Plan selection (`/guest/plans`).

2. **Subscription Selection & Comparison Page** (`/guest/plans` and `/packages`)
   - **Path:** `frontend/src/features/guest/SubscriptionPlansPage.tsx`
   - **Inputs & Controls:**
     - Currency toggle: USD (`$`) vs VND (`₫`).
     - Billing cycle toggle: Monthly vs Annually (with 20% discount highlight).
   - **Tiers Supported:**
     - **Starter Tier:** 20 seats ($199/mo or 4,900,000 ₫/mo).
     - **Growth Tier (Most Popular):** 50 seats ($499/mo or 12,250,000 ₫/mo).
     - **Enterprise Tier:** 200 seats ($999/mo or 24,500,000 ₫/mo).
   - **Features:** Dynamic price calculation, capability checkmarks, plan persistence to checkout state, routing to `/guest/checkout`.

3. **PayOS Checkout & Payment Status Page** (`/guest/checkout`)
   - **Path:** `frontend/src/features/guest/PayOsCheckoutPage.tsx`
   - **Features:**
     - Order summary card with plan name, seat limit, billing interval, and VAT status.
     - VietQR SVG code generation with banking transfer details (MB Bank / VietinBank, Account Number, Amount, Transfer Memo `ALGXXXXXX`).
     - 15-minute countdown timer with auto-timeout.
     - Interactive simulation toolbar: *"Simulate PayOS Success Webhook"* (records confirmed transaction, logs platform audit event, redirects to provisioning) and *"Simulate Failure"* (shows retry button without double-charging).

4. **Workspace Provisioning Status Page** (`/guest/onboarding-status`)
   - **Path:** `frontend/src/features/guest/WorkspaceProvisioningPage.tsx`
   - **Features:**
     - Automated 4-step provisioning pipeline:
       1. PayOS Webhook HMAC-SHA256 signature validation.
       2. PostgreSQL tenant schema & department isolation creation.
       3. Neo4j graph space and node label constraint initialization.
       4. System Administrator credentials and seat entitlement activation.
     - Progress bar (0% ➔ 100%).
     - Real-time company creation in `companyStore` via `createCompanyFromPackagePurchase`.
     - Direct CTA: *"Launch Admin Console"* or *"Enter as L&D Manager"*.

5. **Shared Guest Public Layout** (`frontend/src/features/guest/GuestLayout.tsx`)
   - 4-step visual stepper (`1. Organization & Admin` ➔ `2. Subscription Plan` ➔ `3. PayOS Checkout` ➔ `4. Workspace Setup`).
   - Sticky topbar with platform branding, Language Switcher, and *"Sign In"* link.

6. **Login Page Guest Entry Point** (`/login`)
   - **Path:** `frontend/src/features/auth/LoginPage.tsx`
   - **Features:**
     - Form-integrated inline guest sign-up prompt: *"Don't have an account? Sign Up as Guest"* (`#guest-signup-link`) rendered cleanly below the *"Sign in"* submit button, eliminating extraneous boxes/containers and preserving the card's minimalist vertical rhythm.
     - Top navbar remains streamlined with brand identity and Language Switcher (`EN`/`VI`).
     - Full bi-directional language switching (English: *"Don't have an account? Sign Up as Guest"*, Vietnamese: *"Chưa có tài khoản? Đăng ký Khách"*).

---

### Group B: Platform Administrator Screens
6. **Platform Organizations Management Page** (`/platform-admin/organizations`)
   - **Path:** `frontend/src/features/platform-admin/PlatformOrganizationsPage.tsx`
   - **Features:**
     - Global KPIs: Total Registered Organizations, Active Workspaces, Suspended Workspaces, Total Subscribed Seats.
     - Search filter by organization name, domain, admin email.
     - Status tabs: `All Organizations`, `Active`, `Suspended`.
     - Multi-tenant Organization Table: Organization name, tenant slug, tier badge, seat utilization progress bar, designated admin, workspace status, created date.
     - Actions:
       - **Suspend Workspace / Reactivate Workspace:** Interactive confirmation dialog with suspension reason notes.
       - **Edit Organization Details:** Dialog to update organization name, owner email, and seat quotas.
       - **Inspect Workspace:** One-click tenant switcher to explore that specific organization workspace.

7. **Platform Subscription Plans Configuration Page** (`/platform-admin/subscriptions`)
   - **Path:** `frontend/src/features/platform-admin/PlatformSubscriptionsConfigPage.tsx`
   - **Features:**
     - Summary KPI cards: Total configured tiers, max seat limit, currency support.
     - Tier configuration cards for Starter, Growth, Enterprise with monthly/annual prices in USD & VND.
     - Edit modal: Update plan name, description, USD price (monthly/annual), VND price (monthly/annual), and seat quota.
     - Active/Inactive visibility toggle.
     - Live synchronization with Guest Plan selection catalog via `platformAdminStore.ts`.

8. **Platform Activity & Health Monitoring Page** (`/platform-admin/activity`)
   - **Path:** `frontend/src/features/platform-admin/PlatformActivityMonitoringPage.tsx`
   - **Features:**
     - Infrastructure Health KPIs: Neo4j Graph Core (24ms latency), PostgreSQL Relational (11ms latency), PayOS Webhook Service (99.9% uptime, 180ms verification), MinIO Private Storage (100% uptime).
     - Cross-tenant audit event feed: Real-time logs for subscriptions, tenant provisioning, workspace suspensions, and security audits.
     - Filter by severity: `All Events`, `SUCCESS`, `INFO`, `WARNING`, `ERROR`.
     - Search bar across actions, organization names, and event details.
     - One-click CSV export of platform audit logs.

---

## 3. Navigation & Architecture Integration
- **`WorkspaceLayout.tsx`:**
  - Expanded `ActorRole` to include `'platform-admin'`.
  - Added Platform Administrator navigation tabs: Organizations, Subscriptions, Platform Activity, and Server Status.
  - Added Platform Superadmin link to the user persona dropdown switcher.
- **`App.tsx`:**
  - Wired routes: `/register`, `/guest/register`, `/packages`, `/guest/plans`, `/guest/checkout`, `/guest/onboarding-status`, `/platform-admin/organizations`, `/platform-admin/subscriptions`, `/platform-admin/activity`.
