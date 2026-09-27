---
name: ui-ux-pro-max
description: UI/UX design intelligence skill for creating high-converting, aesthetically stunning, and accessible user interfaces. Incorporates modern layout principles, color harmonies, micro-interactions, responsive grids, and design system best practices.
---

# UI/UX Pro Max Skill: Design Intelligence Guide

This skill provides design heuristics, visual hierarchy rules, and anti-generic UI principles to build premium frontend applications.

## 1. Core Visual Hierarchy & Layout Heuristics

- **Eliminate Dead Whitespace**: Avoid centering layouts with large empty side margins unless intentionally requested for reading-focused blogs. SaaS dashboards and workspace shells should sit directly adjacent to sidebars with controlled padding (`16px` to `24px` gap).
- **Surface Elevation & Depth**:
  - Distinguish background canvases from surface cards with subtle contrast (`bg-background` vs `bg-card`).
  - Use delicate, crisp 1px borders (`border-border`) paired with soft ambient box-shadows rather than heavy, blurry drop-shadows.
  - For dark themes, use layered surfaces (`#171310` -> `#221D19` -> `#2D2622`) with glowing primary borders (`border-primary/30`).
- **Modern Density**: 
  - Prefer compact, information-rich cards with scannable metrics over bloated, airy layouts.
  - Ensure action bars, breadcrumbs, and page headers remain sticky or neatly anchored.

## 2. Color Discipline & Psychology

- **60-30-10 Color Rule**:
  - **60% Dominant Canvas & Surfaces**: Clean stone/neutral white in light mode, deep warm charcoal in dark mode.
  - **30% Secondary Elements**: Badges, muted icons, cards, dividers, input borders, neutral hover states.
  - **10% Accent / Brand Orange**: Primary action buttons, active tab indicators, focus rings, key metric highlights.
- **Contrast & Accessibility (WCAG AA)**:
  - All text on colored backgrounds must achieve at least 4.5:1 contrast.
  - Never use light gray text on light background; use `text-muted-foreground` (`#786D65` or darker).
  - Use distinct status colors (Success `#16A34A`, Warning `#D97706`, Destructive `#DC2626`).

## 3. Typography Rules

- **Standard Scale**:
  - Hero / Display: 32px–36px, `font-bold`, `tracking-tight`
  - H1 Page Title: 26px–28px, `font-bold`, `tracking-tight`
  - H2 Section: 20px–22px, `font-semibold`
  - H3 Subsection: 18px, `font-semibold`
  - H4 Card Title: 15px–16px, `font-semibold`
  - Body: 15px–15.5px, `font-normal`, `leading-normal`
  - Caption / Metadata: 13px, `font-medium`
  - Eyebrow: 12px, `font-bold`, `uppercase`, `tracking-wider`, `text-primary`
- **Never Mix Arbitrary Sizing**: Always use semantic typography components (`<Heading />`, `<Text />`) to prevent font size fragmentation.

## 4. Micro-Interactions & State Polish

- **Smooth Transitions**: Use `transition: all 0.15s ease-in-out` on interactive controls (buttons, links, table rows).
- **Clear Active & Hover Feedback**:
  - Buttons scale subtly (`active:scale-[0.98]`).
  - Cards elevate slightly on hover (`hover:shadow-md hover:border-primary/40`).
- **Interactive Feedback**: Provide instant notifications via toasts, copy-to-clipboard badges, and loading spinners for asynchronous actions.
