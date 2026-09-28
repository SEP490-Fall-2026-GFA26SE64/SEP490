# Frontend Design System Guidelines

This document provides system-wide design rules, color tokens, typography scales, and component placement guidelines for developers and AI code generation.

## 1. Color Palette System (Refined Orange with Cool Slate Neutrals)

The team has selected a **Refined Brand Orange** paired with an **eye-friendly Cool Slate Canvas** and a **distinct Vivid Yellow** for pending/in-progress states:

| Token Name | Class Alias | Hex Code | Usage |
| --- | --- | --- | --- |
| **Primary** | `bg-primary` / `text-primary` | `#EA580C` | Main CTAs, active links, primary buttons, focus rings, brand accents |
| **Primary Hover** | `hover:bg-primary-hover` | `#C2410C` | Primary button and CTA hover state |
| **Secondary Tint** | `bg-secondary` / `text-secondary-foreground` | `#FFF5EB` / `#9A3412` | Secondary action buttons, active tab indicators, selected items, badges |
| **Canvas Background** | `bg-background` | `#F8FAFC` | Crisp, cool slate canvas — easy on the eyes, prevents warm eye-strain |
| **Surface / Card** | `bg-card` | `#FFFFFF` | Content containers, modals, popovers, dropdown lists |
| **Foreground / Body Text** | `text-foreground` | `#0F172A` | Deep slate headings and primary text with maximum legibility |
| **Muted Text** | `text-muted-foreground` | `#64748B` | Subtitles, breadcrumbs, disabled labels, metadata |
| **Border / Divider** | `border-border` | `#E2E8F0` | Card borders, table dividers, input borders |
| **Success State** | `bg-success` | `#16A34A` | Completed badges, positive status indicators |
| **In Progress / Warning** | `bg-warning` / `text-warning-foreground` | `#EAB308` / `#0F172A` | **Vivid Yellow**: In-progress, pending, caution indicators (distinct from brand orange) |
| **Destructive State** | `bg-destructive` | `#DC2626` | Error alerts, delete actions |

> **Rule for AI & Code Generation:** Never hardcode hex colors (e.g. `#EA580C` or `#EAB308`) inside React JSX. Always use semantic Tailwind utility classes like `bg-primary`, `text-muted-foreground`, `border-border`, `bg-warning`.

---

## 2. Typography & Fonts System

All wording across the application must strictly adhere to the unified typography scale to prevent font size, weight, and hierarchy mismatches:

- **Font Family:** `IBM Plex Sans`, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif (imported in `main.tsx`).
- **Heading Primitives:** Use `src/shared/components/typography/Heading.tsx`
  - `Display / Hero (32px)`: `<Heading level={1} size="display" />` (font-bold, tracking-tight, leading-tight)
  - `Page Title / H1 (26px)`: `<Heading level={1} size="page" />` (font-bold, tracking-tight)
  - `Section Heading / H2 (20px)`: `<Heading level={2} size="section" />` (font-semibold, tracking-tight)
  - `Subsection Heading / H3 (16px)`: `<Heading level={3} size="subsection" />` (font-semibold)
  - `Card Header / H4 (15px)`: `<Heading level={4} size="card" />` (font-semibold)
- **Text Primitives:** Use `src/shared/components/typography/Text.tsx`
  - `Lead / Subtitle (15px)`: `<Text variant="lead" />` or `<Text variant="subtitle" />` (font-normal, leading-relaxed, text-muted-foreground)
  - `Body Default (14px)`: `<Text variant="body" />` (font-normal, leading-normal, text-foreground)
  - `Body Small (13px)`: `<Text variant="body-sm" />` (font-normal, text-muted-foreground)
  - `Caption (12px)`: `<Text variant="caption" />` (font-medium, text-muted-foreground)
  - `Eyebrow / Overline (11px)`: `<Text variant="eyebrow" />` (font-bold, uppercase, tracking-wider, text-primary)

---

## 3. Workspace Layout & Sidebar Alignment Rules

- The layout is provided by `src/shared/layouts/WorkspaceLayout.tsx`.
- The main content area sits directly adjacent to the sidebar without awkward auto-centering dead space (`margin: 0`, `padding: 24px 32px`).
- On wide displays, content flows smoothly and maintains visual continuity with the navigation panel.

---

## 4. Component Storage & Ownership Rules

| Component Type | Directory Location | Examples | Guidelines |
| --- | --- | --- | --- |
| **Shared Primitives** | `src/shared/components/ui/` | `Button.tsx`, `Breadcrumb.tsx`, `Combobox.tsx`, `List.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx` | Pure UI controls forwarding ref & props; **NO** API calls or feature state. |
| **Typography Primitives** | `src/shared/components/typography/` | `Heading.tsx`, `Text.tsx` | Reusable semantic text and heading components. |
| **Shared Layouts** | `src/shared/layouts/` | `WorkspaceLayout.tsx` | Navigation shell, header, sidebar, footer. |
| **Feature Components** | `src/features/<feature>/components/` | `SystemStatusCard.tsx`, `AdaptivePathwayTimeline.tsx` | Compose shared UI primitives with feature state and handlers. |

---

## 5. UI Component Patterns

### Button Variants
- **Primary:** `variant="primary"` -> Warm Orange fill (`bg-primary text-primary-foreground hover:bg-primary-hover`).
- **Secondary:** `variant="secondary"` -> Cream peach tint (`bg-secondary text-secondary-foreground hover:bg-secondary/80`).
- **Outline:** `variant="outline"` -> Bordered with transparent background (`border border-input bg-background hover:bg-muted`).
- **Ghost:** `variant="ghost"` -> Unbordered hover fill (`hover:bg-muted text-foreground`).
- **Destructive:** `variant="destructive"` -> Red filled (`bg-destructive text-white`).

### Combobox / Select
- Use `src/shared/components/ui/Combobox.tsx` for searchable select dropdowns.

### Breadcrumb
- Use `src/shared/components/ui/Breadcrumb.tsx` with `{ label, href }` items for clean hierarchical navigation.
