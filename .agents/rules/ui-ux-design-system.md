---
trigger: always_on
description: Always enforce UI-UX Pro Max design heuristics and the enterprise design system.
---

# UI-UX Pro Max & Design System Enforcement Rule

Always apply these rules to all frontend code and modifications in this repository without needing explicit user prompts.

## 1. UI-UX Pro Max Heuristics
- **Visual Depth & Surfaces**: Distinguish background canvases from surface cards with subtle contrast (`bg-background` vs `bg-card`). Use crisp 1px borders (`border-border`) paired with soft ambient shadows rather than heavy drop shadows.
- **Snug, Modern Density**: Eliminate excessive dead whitespace. Keep sidebars and main content anchored cleanly. Action bars, filters, and tables should sit comfortably without artificial empty gutters.
- **Micro-Interactions**: Interactive elements must include smooth transitions (`transition-all duration-150`), hover states, and clear focus rings (`focus:ring-primary/25 focus:border-primary`).
- **No Breadcrumbs on Pages**: Keep breadcrumbs exclusively in `DesignSystemShowcasePage.tsx`. Do NOT add breadcrumbs to feature pages unless explicitly requested.

## 2. Strict Design Tokens (Zero Hardcoded Colors)
Never hardcode arbitrary hex codes in stylesheets or components. Always reference defined CSS variables:
- Primary CTA / Brand Accent: `hsl(var(--primary))` (`#EA580C`)
- Amber Hover: `hsl(var(--primary-hover))` (`#C2410C`)
- Soft Secondary Tint: `hsl(var(--secondary))` (`#FFF5EB`)
- Secondary Hover: `hsl(var(--secondary-hover))` (`#FEE6D4`)
- Page Background / Canvas: `hsl(var(--background))` (`#F8FAFC`)
- Neutral Slate Fill / Recessed Docks: `hsl(var(--muted))` (`#F1F5F9`)
- Surface Containers: `hsl(var(--card))` (`#FFFFFF`)
- Borders: `hsl(var(--border))` (`#E2E8F0`)
- Text Primary: `hsl(var(--foreground))` (`#0F172A`)
- Text Muted: `hsl(var(--muted-foreground))` (`#64748B`)
- Status Success: `hsl(var(--success))` (`#16A34A`)
- Status Warning (In Progress / Pending): `hsl(var(--warning))` (`#EAB308`)
- Status Failed / Destructive: `hsl(var(--destructive))` (`#DC2626`)

## 3. Typography Hierarchy
Use the standard scale defined in `tokens.css` and `typography.css`:
- Display: `36px` (`--text-display`), bold
- Page Heading (H1): `28px` (`--text-page`), bold
- Section (H2): `22px` (`--text-section`), semibold
- Subsection (H3): `18px` (`--text-subsection`), semibold
- Card Header (H4): `16px` (`--text-card`), semibold
- Subtitle / Lead: `16.5px` (`.text-lead`, `.text-subtitle`)
- Body Default: `15.5px` (`--text-body`)
- Body Small: `14px` (`--text-body-sm`)
- Caption: `13px` (`--text-caption`)
- Eyebrow: `12px` (`--text-eyebrow`), uppercase, bold

## 4. Shared Components First Policy
Always reuse existing components from `src/shared/components/ui/` and `src/shared/components/typography/` instead of creating ad-hoc HTML elements or duplicates:
- Page layout headers: `<PageHeader />`
- KPI / Metrics / Summary tiles: `<StatCard />`
- Semantic Headings: `<Heading />`
- Semantic Text: `<Text />`
- Buttons: `<Button />` (variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`)
- Status Badges: `<Badge />` (variants: `primary`, `secondary`, `outline`, `success`, `warning`, `destructive`)
- Surface Cards: `<Card />`, `<CardHeader />`, `<CardTitle />`, `<CardDescription />`, `<CardContent />`
- Tab Navigation: `<Tabs />`, `<TabsList />`, `<TabsTrigger />`, `<TabsContent />`
- Modals / Popups: `<ConfirmationModal />`, `<Dialog />`
- Form Controls: `<Input />`, `<Combobox />`, `<RadioGroup />`, `<Progress />`

If a newly required UI pattern will be used more than once across portals (Learner, Manager, Administrator), extract and place it into `src/shared/components/ui/`.
