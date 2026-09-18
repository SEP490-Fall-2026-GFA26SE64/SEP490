/# Frontend Design System Guidelines

This document provides system-wide design rules, color tokens, and component placement guidelines for developers and AI code generation.

## 1. Color Palette System

The system follows an accessible modern visual style with high contrast and clean typography.

| Token Name | Class Alias | Hex Code | Usage |
| --- | --- | --- | --- |
| **Primary** | `bg-primary` / `text-primary` | `#0056D2` | Main CTAs, active links, primary buttons, focus rings |
| **Primary Hover** | `hover:bg-primary-hover` | `#00419E` | Primary button hover state |
| **Secondary Tint** | `bg-secondary` / `text-secondary-foreground` | `#E8F0FE` | Secondary action buttons, active tab indicators, selected items |
| **Canvas Background** | `bg-background` | `#F5F7FA` | Page body background |
| **Surface / Card** | `bg-card` | `#FFFFFF` | Content containers, modals, popovers, dropdown lists |
| **Foreground / Body Text** | `text-foreground` | `#1F2937` | Headings and primary paragraph text |
| **Muted Text** | `text-muted-foreground` | `#5F6464` | Subtitles, breadcrumbs, disabled labels, metadata |
| **Border / Divider** | `border-border` | `#D1D7DC` | Card borders, table dividers, input borders |
| **Success State** | `bg-success` | `#16A34A` | Completed badges, positive status indicators |
| **Destructive State** | `bg-destructive` | `#DC2626` | Error alerts, delete buttons |

> **Rule for AI & Code Generation:** Never hardcode hex colors (e.g. `#0056D2`) inside React component JSX. Always use semantic Tailwind utility classes like `bg-primary`, `text-muted-foreground`, `border-border`.

---

## 2. Typography & Fonts

- **Font Family:** `IBM Plex Sans`, sans-serif (imported in `main.tsx`).
- **Heading Scale:**
  - `Display / Page Title (H1)`: `text-3xl font-bold tracking-tight text-foreground`
  - `Section Heading (H2)`: `text-xl font-semibold text-foreground`
  - `Subsection Heading (H3)`: `text-lg font-medium text-foreground`
  - `Card Header (H4)`: `text-base font-medium text-foreground`
- **Body Text:** `text-sm` (14px) or `text-base` (16px) with `leading-relaxed`.

---

## 3. Component Storage & Ownership Rules

| Component Type | Directory Location | Examples | Guidelines |
| --- | --- | --- | --- |
| **Shared Primitives** | `src/shared/components/ui/` | `Button.tsx`, `Breadcrumb.tsx`, `Combobox.tsx`, `List.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx` | Pure UI controls forward ref & props; **NO** API calls or feature state. |
| **Typography Primitives** | `src/shared/components/typography/` | `Heading.tsx` | Reusable semantic text components. |
| **Shared Layouts** | `src/shared/layouts/` | `WorkspaceLayout.tsx` | Navigation shell, header, sidebar, footer. |
| **Feature Components** | `src/features/<feature>/components/` | `SystemStatusCard.tsx`, `LearnerProgressList.tsx` | Compose shared UI primitives with feature data fetching and handlers. |

---

## 4. UI Component Patterns

### Button Variants
- **Primary:** `variant="primary"` -> Primary Blue fill (`bg-primary text-white hover:bg-primary-hover`).
- **Secondary:** `variant="secondary"` -> Light blue tint (`bg-secondary text-secondary-foreground hover:bg-secondary/80`).
- **Outline:** `variant="outline"` -> Bordered with transparent background (`border border-input bg-background hover:bg-muted`).
- **Ghost:** `variant="ghost"` -> Unbordered hover fill (`hover:bg-muted text-foreground`).
- **Destructive:** `variant="destructive"` -> Red filled (`bg-destructive text-white`).

### Combobox / Select
- Use `src/shared/components/ui/Combobox.tsx` for searchable select dropdowns.
- Supports placeholder, search filtering, empty states, disabled items, and controlled value state.

### List
- Use `src/shared/components/ui/List.tsx` with `ListItem`.
- Supports default, interactive hover, and bordered divider options.

### Breadcrumb
- Use `src/shared/components/ui/Breadcrumb.tsx`.
- Pass list of `{ label, href }` items for clean hierarchical site navigation.
