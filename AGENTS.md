# Project Agent Instructions & Design System Standard

## UI-UX Pro Max & Design System Enforcement (Always Active)

Every frontend change in this workspace must adhere to the **UI-UX Pro Max** standard and the project design system automatically without requiring user prompting.

### 1. Visual Aesthetics & Layout
- **Surface Elevation**: Layer cards (`bg-card`, `#FFFFFF`) over clean canvas (`bg-background`, `#F8FAFC`) with crisp 1px borders (`border-border`, `#E2E8F0`) and subtle ambient shadows.
- **Snug Modern Density**: Eliminate excessive dead whitespace; keep action bars, tables, and content anchored cleanly to sidebars.
- **Breadcrumb Rule**: Breadcrumbs are kept **only** in `DesignSystemShowcasePage.tsx`. Do not add breadcrumbs to individual feature pages.

### 2. Design Tokens (Zero Hardcoded Hex Codes)
Always use CSS variables from `tokens.css`:
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
Always check and reuse components in `src/shared/components/ui/` and `src/shared/components/typography/`:
- `<PageHeader />` for all page headers
- `<StatCard />` for all metric / KPI cards
- `<Heading />`, `<Text />`, `<Button />`, `<Badge />`, `<Card />`, `<Tabs />`, `<Accordion />`, `<Dialog />`, `<Input />`, `<Progress />`
- If a component is shared across actors (Learner, Manager, Admin), place it in `src/shared/components/ui/`.

---

## Mandatory AI Feature Implementation Lifecycle (Always Active)

When implementing any feature, enhancement, or bug fix using AI, all agents must strictly follow the 5-step lifecycle in sequence:

1. **Clear Requirement of Function Using AI**: Find and read the function specification in `documents/features/<Feature>/<Function>.md` (extract ID `REQ-nnn-Fnn`, rules, inputs/outcomes, and open decisions). **Architectural Schema Inventory & Primary Source of Truth**: Treat [documents/ARCHITECTURE.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/ARCHITECTURE.md) and [documents/neo4j_schema.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/neo4j_schema.md) as the **primary source of truth FIRST**. Note that the frontend is a UI created beforehand to visualize the system and may contain legacy mock attributes (`provenance`, `bloomLevel`, `observableOutcome`, etc.) not in the schema. Never alter backend/domain schemas to match mock UI fields; instead, refactor the frontend to strictly follow the architecture. Proactively discuss and align with the user; do not touch code until requirements and architectural field scope are cleared.
2. **Implement Using AI**: Start implementation only after user alignment.
   - **Zero Blank Architecture Fields & Strict Schema Compliance**: Under NO circumstances should any field defined in [documents/ARCHITECTURE.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/ARCHITECTURE.md) (or [documents/neo4j_schema.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/neo4j_schema.md)) be left empty, unmapped, unseeded, or ignored. Remove legacy mock attributes not defined in the architecture. All database seeders (`DevelopmentCatalogSeeder`, Flyway), persistence mappers (`Neo4jTargetRoleMapper`, `Neo4jMicroSkillRepository`), domain models, DTOs, and frontend UI forms/tables/modals MUST fully populate, map, and utilize every defined field without omissions.
   - **UI-UX Pro Max Enforcement**: Strictly adhere to `tokens.css` (zero hardcoded hex colors), standard typography scale, snug modern density, and surface elevation.
   - **Shared Components First**: Always reuse shared components from `src/shared/components/ui/` (`<PageHeader />`, `<StatCard />`, `<Button />`, `<Badge />`, `<Card />`, `<Pagination />`, etc.).
   - **Clean Architecture**: Strict hexagonal boundaries (no unauthorized cross-layer dependencies, enforced by ArchUnit).
   - **Zero Frontend Mock Data**: Remove all mock data related to the task on the frontend and migrate initial/seed data into PostgreSQL or Neo4j per architecture.
3. **Test Using AI**: Read and strictly follow the testing documentation in `documents/testing/` ([README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/README.md), [unit/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/unit/README.md), [integration/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/integration/README.md), and [system/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/system/README.md)). Perform all relevant testing levels (Unit, Integration with Testcontainers, and System with Compose stack). Explicitly assert that all architecturally defined fields are persisted, retrieved, and non-empty. Maintain dedicated test evidence files per REQ in `unit/`, `integration/`, and `system/` folders (do not use README.md as a monolithic central registry).
4. **Test Manual**: Interactively verify visual behavior, user flows, and field completeness (ensure all architectural fields are displayed and populated with meaningful data). Always provide the user with a structured Manual Test Checklist (URL, prerequisites, steps, expected results).
5. **Update Document**: Update everything related to that task in the `documents/` folder. This strictly includes [documents/ARCHITECTURE.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/ARCHITECTURE.md) (entity schemas, field definitions, and store responsibilities) and [documents/neo4j_schema.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/neo4j_schema.md), feature specifications (`documents/features/`), dedicated test evidence (`documents/testing/<level>/<REQ-ID>-<feature>.md`), and manual browser procedures (`documents/testing/system/`).

Detailed guide: [.agents/rules/ai-feature-workflow.md](file:///d:/Code/Capstone/SEP490/.agents/rules/ai-feature-workflow.md).

---

## Capstone Committee Evaluation & UX Semantic Standard (Always Active)

Every feature and modification must meet enterprise presentation standards for the **Capstone Evaluation Committee (Hội đồng chấm Capstone)**:

1. **Human-Centric UX Semantics (Highest Priority)**:
   - **Zero Spec Dumps**: Never dump technical architecture, database schemas, or developer checklists into UI labels, subtitles, or tooltips (e.g., replace *"Structure internal business units, assign department leadership, align O\*NET occupations, and manage workforce capacity..."* with clear, benefit-driven copy: *"Organize company departments, assign leadership, and track team competency coverage across your business units."*).
   - **Zero Unusable Terms**: Never describe capabilities the user cannot actually perform on that screen.
   - **Bi-directional i18n**: Both English and Vietnamese microcopy must be polished, professional, and natural.
2. **Shared Component Reuse**: Mandatory reuse of `<PageHeader />`, `<StatCard />`, `<Card />`, `<Button />`, `<Badge />`, `<Dialog />`, `<Input />`, `<Tabs />`, etc. No unstyled ad-hoc HTML duplicates.
3. **Clean Code & Strict Boundaries**: 100% strict TypeScript types (zero `any`), no unused code/console logs, strict Hexagonal boundaries.
4. **Exhaustive Edge Cases**: Fully handle empty states (helpful empty state + CTA), long strings/truncation, async loading skeletons, double-click/mutation locking, and network error recovery.
5. **Playwright E2E Flow Testing**: Validate complete end-to-end user journeys (navigate $\rightarrow$ interact $\rightarrow$ mutation $\rightarrow$ visual update $\rightarrow$ edge/cancel flows) with automated Playwright specs (`frontend/system-tests/`) running against the Compose stack.

Detailed guide: [.agents/rules/ux-semantics-clean-code-playwright.md](file:///d:/Code/Capstone/SEP490/.agents/rules/ux-semantics-clean-code-playwright.md).



