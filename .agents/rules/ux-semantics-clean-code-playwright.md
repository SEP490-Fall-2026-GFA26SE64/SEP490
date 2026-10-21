---
trigger: always_on
description: Strict standard for Clean Code, Shared Component Reuse, Edge Case Robustness, Playwright E2E User Flow Testing, and Human-Centric UX Semantics for Capstone Committee Evaluation.
---

# Capstone Evaluation & Production-Grade UX Quality Standard

This rule is **always active** across all feature implementations, enhancements, refactors, and bug fixes. The standard of work in this repository is not merely passing unit tests; it must be **flawlessly demo-ready for the Capstone Evaluation Committee (Hội đồng chấm Capstone)** and enterprise-grade for real B2B users.

Agents must dedicate sufficient reasoning, double-check copy and interactions, and never take shortcuts.

---

## 1. Human-Centric UX Semantics & Microcopy (QUAN TRỌNG NHẤT)

The evaluation committee judges the system through the eyes of an enterprise user (Employee, Expert, L&D Manager, Administrator). Robotic phrasing, developer-speak, or useless technical dumps ruin the user experience and give a negative impression of product maturity.

### The Golden Semantic Rule
> **Write for the human user performing a real task. Never dump technical specifications, database field lists, or developer checklists into UI labels, subtitles, or tooltips.**

### Concrete Anti-Patterns vs. Evaluation-Grade Copy

| Context | ❌ Anti-Pattern (Developer / Spec Dump) | ✅ Evaluation-Grade User Copy (Human-Centric & Actionable) |
| :--- | :--- | :--- |
| **Page Header Description** | *"Structure internal business units, assign department leadership, align O\*NET occupations, and manage workforce capacity (5 units in TechNova Cognitive Labs)."* | *"Organize company departments, assign leadership, and track team competency coverage across your business units."* |
| **Target Roles Catalog** | *"Configure micro-skill prerequisites, proficiency thresholds (1–100%), and weighting."* | *"Define target job roles, customize required skills, and establish benchmark proficiency targets for your workforce."* |
| **Pathway Approval Queue** | *"Review initial pathways generated from employee baseline assessments, customize module inclusions, request system replanning, and approve for learning."* | *"Review adaptive learning pathways tailored for your team members, adjust recommended modules, and approve personalized study plans."* |
| **Empty State** | *"No records in table departments."* | *"No departments created yet. Add your first department to start structuring teams and assigning managers."* |
| **Button Label** | *"Submit Data"* / *"Process"* / *"Execute"* | *"Create Department"* / *"Publish Pathway"* / *"Assign Role"* |
| **Error Feedback** | *"Network error 400 Bad Request in payload"* | *"Unable to save changes. Please verify that all required fields are filled out and try again."* |

### Semantic Microcopy Checklist (Must Double-Check)
1. **Zero Technical Artifacts**: Never expose internal codes (`skill-vec-01`), database IDs, enum strings (`STATUS_ACTIVE_PENDING`), or architecture jargon (`outbox relay`, `graph label`, `neo4j constraint`) to end users.
2. **Zero Unusable / Phantom Features**: Never mention actions or metrics in descriptions that the user cannot actually perform or view on that screen.
3. **Action & Outcome Alignment**: Subtitles must clearly state:
   - What is the primary purpose of this screen?
   - What benefit does the user get?
   - What is the next logical step?
4. **Bi-directional i18n Quality**: Ensure both English and Vietnamese translations in `phrases.ts` are natural, professional, and grammatically impeccable. Never leave machine-translated artifacts or mismatched keys.

---

## 2. Strict Shared Component Reuse ("Dùng Component Đã Define")

Never re-invent existing UI patterns or create raw, unstyled HTML elements (`<button>`, `<div>` cards, ad-hoc inputs) when a standardized component exists.

### Mandatory Component Registry

| UI Need | Mandatory Shared Component | Location |
| :--- | :--- | :--- |
| **Page Layout Headers** | `<PageHeader />` | `src/shared/components/ui/PageHeader.tsx` |
| **Metric / KPI Cards** | `<StatCard />` | `src/shared/components/ui/StatCard.tsx` |
| **Card Containers** | `<Card />`, `<CardHeader />`, `<CardTitle />`, `<CardDescription />`, `<CardContent />` | `src/shared/components/ui/Card.tsx` |
| **Headings & Hierarchy** | `<Heading level={1-4} />` | `src/shared/components/typography/Heading.tsx` |
| **Body & Supporting Text** | `<Text variant="..." />` | `src/shared/components/typography/Text.tsx` |
| **Buttons & CTAs** | `<Button variant="primary \| secondary \| outline \| ghost \| destructive" />` | `src/shared/components/ui/Button.tsx` |
| **Status Indicators** | `<Badge variant="primary \| secondary \| outline \| success \| warning \| destructive" />` | `src/shared/components/ui/Badge.tsx` |
| **Progress Meters** | `<Progress value={...} />` | `src/shared/components/ui/Progress.tsx` |
| **Modals & Dialogs** | `<Dialog />`, `<ConfirmationModal />` | `src/shared/components/ui/Dialog.tsx` |
| **Form Inputs** | `<Input />`, `<Combobox />`, `<RadioGroup />` | `src/shared/components/ui/` |
| **Tab Navigation** | `<Tabs />`, `<TabsList />`, `<TabsTrigger />`, `<TabsContent />` | `src/shared/components/ui/Tabs.tsx` |
| **Pagination** | `<Pagination />` | `src/shared/components/ui/Pagination.tsx` |

**Rule of Extraction**: If a newly required UI element appears or will appear in more than one portal (Learner, Manager, Admin, Expert), extract it into `src/shared/components/ui/` immediately.

---

## 3. Clean Code & Strict Hexagonal Boundaries

Code quality must be clean, maintainable, and strictly architected:

1. **Strict Type Safety**:
   - Zero `any` types.
   - No blind type coercions (`as unknown as TargetType`) unless interacting with legacy third-party untyped libs with an explicit comment.
   - Maintain shared DTO interfaces between API clients and UI views.
2. **Layer Boundaries (Hexagonal Architecture)**:
   - Presentation (`components`, `pages`) $\rightarrow$ State/Hooks (`hooks`, `stores`) $\rightarrow$ API Clients (`api`) $\rightarrow$ Domain Models.
   - Never embed raw `fetch` calls or database queries inside UI components.
   - Backend layers must strictly follow ArchUnit boundary checks (`domain` has zero framework imports, `application` orchestrates use cases, `adapters` connect to HTTP/DB).
3. **Clean Code Hygiene**:
   - Remove unused imports, commented-out dead code, and temporary `console.log` statements.
   - Keep components concise (split views exceeding 250 lines into focused sub-components).
   - Descriptive naming for handlers (`handleCreateDepartment`, not `doSubmit` or `fn`).

---

## 4. Comprehensive Edge Case Handling

Enterprise systems evaluated by committees fail when unexpected edge cases cause crashes, blank screens, or layout glitches. Every feature must explicitly handle:

1. **Empty States**: When an entity list is empty (or search results yield 0 matches), display a polished `<EmptyState />` with a helpful explanation and a clear CTA button to create the first record. Never display a blank table header with no rows.
2. **Long Text & Layout Breaks**: Test with realistic enterprise names (e.g. 50+ characters, special characters, Vietnamese diacritics). Ensure proper truncation with tooltips or multi-line wrapping without breaking grid layouts.
3. **Loading & Mutation States**:
   - Show skeleton loaders or spinner states during data fetching.
   - Disable submit buttons and show loading spinners during async mutations (`isSubmitting`, `isLoading`).
4. **Idempotency & Double-Click Prevention**:
   - Lock submit buttons synchronously upon click to prevent double form submissions.
   - Use idempotency keys on write endpoints where supported.
5. **Network & Error Recovery**:
   - Handle 400 (validation), 401/403 (permissions), 404 (not found), and 500 (server error) gracefully.
   - Display informative toast messages (`variant="destructive"`) with actionable recovery advice.
6. **Boundary Inputs**:
   - Min/max limits (e.g. proficiency scores 1–100%, non-negative seat quotas, valid email patterns).

---

## 5. Playwright End-to-End User Flow Testing ("Test Luồng Bằng Playwright")

Unit tests prove functions work in isolation; Playwright proves the **complete user journey works in the real browser** during a live committee demo.

### Playwright Testing Standards
1. **Location**: Place system flow tests in `frontend/system-tests/REQ-<number>-F<number>-<feature-slug>.spec.ts`.
2. **Execution Against Compose Stack**: Tests must run against the full Docker Compose stack (`compose.dev.yml`) with active PostgreSQL and Neo4j containers.
3. **Complete Story Verification**: Every spec must test the real user flow:
   - **Navigate**: Open the route via real browser navigation.
   - **Inspect Initial State**: Verify headings, user-facing descriptions, and list/data readiness.
   - **Interact**: Type inputs, toggle selections, trigger modals, and click action buttons.
   - **Verify Network & Backend**: Assert API mutations succeed with expected status codes (`200`/`201`/`204`).
   - **Verify Optimistic / Visual Updates**: Assert that newly created or edited items render on screen immediately.
   - **Test Edge / Cancellation Flow**: Test opening a modal and cancelling, testing an invalid input, and ensuring no corrupt state persists.
4. **Command to Validate**:
   ```bash
   npx playwright test --config=playwright.system.config.ts
   ```

---

## 6. Committee Demo Self-Audit Checklist

Before declaring any feature complete, run this 6-point evaluation self-audit:

- [ ] **1. Human Microcopy Audit**: Did you read all titles, descriptions, tooltips, and toasts out loud? Do they sound like a premium B2B product, completely free of developer spec dumps?
- [ ] **2. Component Reuse Audit**: Are all page headers `<PageHeader />`, cards `<Card />`, buttons `<Button />`, and badges `<Badge />` reusing design system components?
- [ ] **3. Edge Case Audit**: Did you test 0 items (empty state), 1 item, and 20+ items? Did you test cancelling a modal? Did you test duplicate clicks?
- [ ] **4. Clean Code Audit**: Are types strict? Are unused imports and console logs deleted? Does `tsc -b` pass with 0 errors?
- [ ] **5. Playwright E2E Audit**: Is there a Playwright spec verifying the complete user flow from start to finish?
- [ ] **6. Bi-directional i18n Audit**: Does switching to Vietnamese (`VI`) produce polished, professional terminology matching the English version?
