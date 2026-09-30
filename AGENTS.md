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
- Soft Tint: `hsl(var(--secondary))` (`#FFF5EB`)
- Page Background: `hsl(var(--background))` (`#F8FAFC`)
- Card Surface: `hsl(var(--card))` (`#FFFFFF`)
- Borders: `hsl(var(--border))` (`#E2E8F0`)
- Text Primary: `hsl(var(--foreground))` (`#0F172A`)
- Text Muted: `hsl(var(--muted-foreground))` (`#64748B`)
- Status Success: `hsl(var(--success))` (`#16A34A`)
- Status Warning: `hsl(var(--warning))` (`#EAB308`)
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

1. **Clear Requirement of Function Using AI**: Find and read the function specification in `documents/features/<Feature>/<Function>.md` (extract ID `REQ-nnn-Fnn`, rules, inputs/outcomes, and open decisions). Proactively discuss and align with the user; do not touch code until requirements are cleared.
2. **Implement Using AI**: Start implementation only after user alignment. Comply with UI-UX Pro Max (`tokens.css`), shared components (`src/shared/components/ui/`), hexagonal/clean architecture, and robust error handling.
3. **Test Using AI**: Read and strictly follow the testing documentation in `documents/testing/` ([README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/README.md), [unit/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/unit/README.md), [integration/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/integration/README.md), and [system/README.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/testing/system/README.md)). Perform all relevant testing levels (Unit, Integration with Testcontainers, and System with Compose stack). Record each case under its `REQ-nnn-Fnn` ID.
4. **Test Manual**: Interactively verify visual behavior and user flows. Always provide the user with a structured Manual Test Checklist (URL, prerequisites, steps, expected results).
5. **Update Document**: Update project feature specifications (`documents/features/`), record test case evidence in `documents/testing/`, update API docs, schema diagrams, and sprint trackers.

Detailed guide: [.agents/rules/ai-feature-workflow.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/.agents/rules/ai-feature-workflow.md).


