# Project Agent Instructions & Design System Standard

## UI-UX Pro Max & Design System Enforcement (Always Active)

Every frontend change in this workspace must adhere to the **UI-UX Pro Max** standard and the project design system automatically without requiring user prompting.

### 1. Visual Aesthetics & Layout
- **Surface Elevation**: Layer cards (`bg-card`, `#FFFFFF`) over clean canvas (`bg-background`, `#F8FAFC`) with crisp 1px borders (`border-border`, `#E2E8F0`) and subtle ambient shadows.
- **Snug Modern Density**: Eliminate excessive dead whitespace; keep action bars, tables, and content anchored cleanly to sidebars.
- **Breadcrumb Rule**: Breadcrumbs are kept **only** in `DesignSystemShowcasePage.tsx`. Do not add breadcrumbs to individual feature pages.

### 2. Design Tokens (Zero Hardcoded Hex Codes)
Always use CSS variables from [tokens.css](frontend/src/shared/styles/tokens.css):
- Brand Orange: `hsl(var(--primary))` (`#EA580C`)
- Amber Hover: `hsl(var(--primary-hover))` (`#C2410C`)
- Soft Tint: `hsl(var(--secondary))` (`#FFF5EB`)
- Secondary Hover: `hsl(var(--secondary-hover))` (`#FEE6D4`)
- Page Background / Canvas: `hsl(var(--background))` (`#F8FAFC`)
- Neutral Slate Fill / Recessed Docks: `hsl(var(--muted))` (`#F1F5F9`)
- Card Surface: `hsl(var(--card))` (`#FFFFFF`)
- Borders: `hsl(var(--border))` (`#E2E8F0`)
- Text Primary: `hsl(var(--foreground))` (`#0F172A`)
- Text Muted: `hsl(var(--muted-foreground))` (`#64748B`)
- Status Success: `hsl(var(--success))` (`#16A34A`)
- Status Warning (In Progress / Pending): `hsl(var(--warning))` (`#EAB308`)
- Status Failed / Destructive: `hsl(var(--destructive))` (`#DC2626`)

### 3. Standard Typography Scale
- Display: `36px` (`--text-display`), bold
- Page Title (H1): `28px` (`--text-page`), bold
- Section (H2): `22px` (`--text-section`), semibold
- Subsection (H3): `18px` (`--text-subsection`), semibold
- Card Header (H4): `16px` (`--text-card`), semibold
- Subtitle / Lead: `16.5px` (`.text-lead`, `.text-subtitle`)
- Body Default: `15.5px` (`--text-body`)
- Body Small: `14px` (`--text-body-sm`)
- Caption: `13px` (`--text-caption`)
- Eyebrow: `12px` (`--text-eyebrow`), uppercase, bold

### 4. Shared Components First
Always check and reuse [shared UI](frontend/src/shared/components/ui/) and [typography](frontend/src/shared/components/typography/):
- `<PageHeader />` for all page headers
- `<StatCard />` for all metric / KPI cards
- `<Heading />`, `<Text />`, `<Button />`, `<Badge />`, `<Card />`, `<Tabs />`, `<Accordion />`, `<Dialog />`, `<Input />`, `<Progress />`
- If a component is shared across actors, place it in [shared UI](frontend/src/shared/components/ui/).

---

## Mandatory Feature Workflow

For feature, enhancement or bug-fix work, load and follow the [feature-implementation skill](.agents/skills/feature-implementation/SKILL.md). It is the single definition of the ordered seven-stage process. Select [Feature Implementer](.github/agents/feature-implementer.agent.md) in VS Code or invoke `/feature-implementation` with a function ID, name or description. The [legacy rule entry](.agents/rules/ai-feature-workflow.md) remains a compatibility link, not a second workflow.

- **Inspect before implementing:** Inventory the selected function's current code, integrations, UI and tests before planning. Distinguish implemented, partial, missing, incorrect and unverified behavior with source evidence. Reuse existing components and preserve working behavior; implement only the approved gaps, without duplicating capabilities or adding unrelated abstractions. If the requested behavior already exists, verify it and report no implementation needed.
- **Clarification and approval:** Resolve scope, measurable DoD, business rules and verification through one single-choice question at a time, with options and a justified recommendation. Save each answer in a temporary working contract in session storage before the next question, not in feature READMEs. Read-only inspection and temporary brief updates may precede approval; implementation requires explicit approval of the presented revision. Reconfirm material changes or missing approval context. This is instruction-based guidance, not a tool-level security lock.
- **Current contract structure:** Start at the [feature index](documents/features/README.md); durable feature documentation lives in domain README files with stable `REQ-nnn-Fnn` anchors. Reuse those definitions and IDs; keep proposed additions, decisions and implementation plans in the temporary working contract until completion, and never reuse retired IDs. Do not recreate a permanent file per function. Customization/documentation tasks use their task brief, not invented product IDs.
- **Product and technical truth:** [Version 2](documents/FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) and approved decisions define intended scope. [Architecture](documents/ARCHITECTURE.md), [schema inventory](documents/neo4j_schema.md), actual migrations and code distinguish current implementation from target behavior. Resolve conflicts explicitly; schema changes need an approved design and forward migration. Never change domain/backend schemas merely to match prototype UI fields.
- **Complete, authorized field handling:** Inventory affected fields and their type, nullability, validation, store ownership and API/UI visibility. Populate and map every required field through the appropriate seed/migration, persistence and domain boundaries. Preserve legitimate nulls, historical references and intentional operation-specific DTO projections. Sensitive/server-managed fields must not become visible/editable merely to satisfy field coverage. Never fabricate review identities or timestamps. Tests must assert both required values and permitted nullability.
- **Engineering safeguards:** Preserve hexagonal boundaries and ArchUnit checks, shared UI/design conventions, trusted organization/assignment/entitlement authorization and relevant error states. Replace task-related runtime mocks with approved real API/persistence behavior; isolated test doubles are allowed. Preserve unrelated user changes and do not silently expand scope or dependencies.
- **Verification and documentation:** Follow the [testing guides](documents/testing/README.md) at every applicable level, including unit/component, API/security, integration/Testcontainers and system/Compose. UI changes require Playwright. Record actual results in dedicated per-REQ evidence and preserve historical runs; blocked checks cannot be reported as Passed. After implementation and required verification are complete, update only the affected feature README sections with concise outcomes, actors, inputs, business rules and relevant limitations. Do not put working contracts, interviews, approvals, test cases/results or architecture details in feature READMEs. Update affected architecture/schema/API/diagram documents separately only when needed, and keep manual checklists with testing evidence. Do not rewrite unrelated plans or claim production completion from a local slice.
- **Operational boundaries:** No unrequested commits, pushes, deployments, real payment operations or destructive database resets. Ask separately for consequential operations outside the approved slice; never collect secrets through the clarification tool.

