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

- **Commit attribution:** Commits are attributed only to the repository user. Never add a `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer or any other Copilot/AI co-author or attribution to commit messages, and do not let tooling add one by default. Copilot must not appear among the repository's GitHub contributors.

