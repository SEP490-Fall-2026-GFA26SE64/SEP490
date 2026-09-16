# Adapt-Learn-Graph Frontend

React + TypeScript + Vite SPA using React Router, TanStack Query, Lucide icons and IBM Plex Sans. The system-status screen demonstrates shared components and a real backend request. Learner, administrator and manager workflows remain unimplemented.

Project and database setup: [../README.md](../README.md).

## Folder Structure

```text
src/
  main.tsx                          React entry point and font imports
  app/
    App.tsx                         Providers and route composition
    styles.css                      Global style import order only
  assets/                           Bundled images and static assets
  features/
    system/
      SystemStatusPage.tsx           Status query and page composition
      SystemStatusPage.css           Status-specific styles
    learner/                        Reserved learner workflows
    administration/                 Reserved administrator workflows
    manager/                        Reserved manager workflows
  shared/
    api/
      system.ts                     Typed HTTP client and response validation
    components/
      ui/
        Button.tsx                  Native button wrapper
        Button.css                  Scoped button styling
      typography/
        Heading.tsx                 Semantic heading with independent size
    layouts/
      WorkspaceLayout.tsx           Header, main landmark and footer
      WorkspaceLayout.css           Responsive shell styling
    styles/
      tokens.css                    Colors, spacing, type sizes and radii
      base.css                      Document defaults and keyboard focus
      typography.css                Heading and eyebrow classes
```

Create additional directories only with their first implementation. Feature-local `components`, `hooks`, `api` and `types` folders can be introduced as workflows grow. Add `shared/hooks` or `shared/utils` only for genuinely reusable behavior; do not create empty generic helpers or duplicate API types.

## Ownership and Imports

| Location | Responsibility | Keep out |
| --- | --- | --- |
| `app` | Router, providers and application composition | Business rules and reusable UI implementations |
| `features/<feature>` | Pages, feature-specific presentation, query/mutation orchestration | Copies of shared primitives |
| `shared/components/ui` | Domain-independent controls such as buttons and future fields | API requests, authorization and feature state |
| `shared/components/typography` | Semantic text components and visual variants | Layout and data fetching |
| `shared/layouts` | Reusable page shells and navigation | Feature queries |
| `shared/api` | HTTP functions, response types and validation | React rendering or database credentials |
| `shared/styles` | Design tokens, base rules and typography | Page-specific selectors |
| `assets` | Imported images and other bundled assets | Secrets, learner responses and hosted learning content |

Dependencies flow from `app` to `features` to `shared`. Shared code must not import features or the application entry point. Layouts may use router primitives and shared components. Avoid cross-feature implementation imports. Use explicit relative imports; no path alias or barrel-export convention is configured.

Use PascalCase for React component files, `useSomething.ts` for hooks and descriptive camelCase for utilities. Colocate component CSS. Follow two-space indentation, single quotes and no semicolons in TypeScript. Use `import type` for type-only dependencies.

## Components and Typography

Use [Button](src/shared/components/ui/Button.tsx) for commands. It defaults to `type="button"`, forwards native button properties and supports children, `disabled`, events and accessible labels. Specify `type="submit"` for form submission. Use a router `Link` for navigation.

Use [Heading](src/shared/components/typography/Heading.tsx) for shared heading styling. `level` chooses HTML semantics; `size` chooses appearance and defaults to `section`. Use one page-level H1 and a logical heading hierarchy. Ordinary paragraphs, labels, terms and definitions should remain native semantic elements unless a wrapper adds useful shared behavior.

Example component for a page directly inside a feature directory:

```tsx
import { RefreshCw } from 'lucide-react'
import { Button } from '../../shared/components/ui/Button'
import { Heading } from '../../shared/components/typography/Heading'

type PageHeadingProps = {
  isLoading: boolean
  onRefresh: () => void
}

export function PageHeading({ isLoading, onRefresh }: PageHeadingProps) {
  return (
    <div>
      <Heading level={1} size="page">System status</Heading>
      <Button onClick={onRefresh} disabled={isLoading}>
        <RefreshCw size={17} aria-hidden="true" />Refresh
      </Button>
    </div>
  )
}
```

The parent owns data fetching and supplies the handler. See [SystemStatusPage](src/features/system/SystemStatusPage.tsx) for actual query integration. Render exactly one [WorkspaceLayout](src/shared/layouts/WorkspaceLayout.tsx) per page; it already provides the `main` landmark. It requires a router provider, supplied by the application.

## Styling Instructions

1. Define shared colors, spacing, radii and type sizes in [tokens.css](src/shared/styles/tokens.css). Reuse semantic tokens before adding hard-coded values.
2. Keep global loading order as tokens, base, then typography in [app/styles.css](src/app/styles.css). Font weights 400, 500 and 600 are imported once in [main.tsx](src/main.tsx).
3. Import component CSS from its component. Keep page styles beside the page. Prefix selectors such as `ui-button` or `status-details`: plain CSS is global, not CSS Modules.
4. Do not style all `button`, `h2`, `main` or `dl` elements from a feature stylesheet. Scope selectors so future screens do not inherit unrelated layout rules.
5. Use IBM Plex Sans, fixed/rem-based type sizes, zero letter spacing and responsive wrapping. Do not scale fonts continuously with viewport width. Allow long labels to wrap and avoid loading-induced layout shifts.
6. Preserve keyboard focus, contrast and native semantics. Decorative Lucide icons use `aria-hidden`; icon-only controls need an accessible name and a tooltip. Label form inputs explicitly.
7. Keep operational screens compact and consistent. Check narrow mobile and desktop layouts. Avoid nested decorative cards, clipped text and overlapping controls.

## Data and State

- Keep remote data in TanStack Query. Pass its abort signal to HTTP clients and validate untrusted response payloads.
- Keep temporary interaction state close to its feature. Do not add global state or memoization by default. React Compiler is not configured.
- Handle loading, empty, failure and stale-data states explicitly. A failed API request must not display fabricated success data.
- Backend authorization is authoritative; frontend route visibility is not access control. Never embed database credentials or session secrets in browser code or `VITE_*` variables.
- The dev proxy forwards `/api` to `http://127.0.0.1:8080` by default. `API_PROXY_TARGET` configures the Vite server proxy, not a browser credential.

## Run and Verify

From this frontend directory with Node.js 22.12+:

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1
npm.cmd run lint
npm.cmd run build
```

Run lint/build in another terminal while the dev server is running. Use `npm` instead of `npm.cmd` on macOS/Linux. Open the URL printed by Vite, usually http://127.0.0.1:5173. Start the backend separately for a connected status; without it, the error state is expected.

`build` runs TypeScript checks and production compilation; `lint` runs Oxlint. No frontend unit-test runner is configured yet, so do not assume an `npm test` script exists. Verify desktop/mobile rendering, keyboard navigation, labels and loading/error/disabled states for UI changes. Add behavior tests with the selected test tooling when introducing complex interactions.

## Add a Feature

1. Add the page under its owning feature, with feature-specific components/types beside it as needed.
2. Compose shared layout, typography and controls. Promote local components to shared only when their purpose is reusable and domain-independent.
3. Add typed API calls and TanStack Query integration, keeping transport logic out of UI primitives.
4. Register the route in [App.tsx](src/app/App.tsx). Do not add navigation to unimplemented screens.
5. Run lint/build and check responsive behavior and relevant states. Update this README when shared folder conventions or component APIs change.
