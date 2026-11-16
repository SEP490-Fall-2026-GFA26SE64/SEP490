# Starter catalog graph refinement - 2026-11-12

Scope: FR-01.01 / legacy REQ-060, Guest frontend only, existing local Docker stack at http://127.0.0.1:8096/guest/register. Backend, Expert graph, API, persistence and dependency rules unchanged.

## Actual verification

Commands run from `frontend` using existing installed tooling:

| Check | Command | Result |
| --- | --- | --- |
| Component/graph regressions | `npm.cmd test -- src\features\guest\GuestCatalogPicker.test.tsx src\features\guest\StarterCatalogGraph.test.tsx` | 12 passed; exit 0 |
| Production build | `npm.cmd run build` | Passed; exit 0, existing large-bundle warning |
| Final type check after position-preservation adjustment | `npx.cmd tsc -b` | Passed; exit 0 |
| Scoped lint | `npm.cmd run lint -- src\features\guest\StarterCatalogGraph.tsx src\features\guest\GuestCatalogPicker.tsx` | Exit 0; three existing ref/effect warnings remain |
| Final Playwright | `$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8096'; npm.cmd run test:system:f02 -- REQ-060-catalog-refinement.spec.ts --output=test-results\catalog-refinement-final` | 2 passed; exit 0; 55.7 seconds |

Final browser run uses real catalog/closure APIs, 748 matching nodes and a selected Software Developers branch. No account creation, payment or database reset. At 1440px and 390px it verifies five collapsible selection groups, collapse/reopen, removal controls, populated graph, legend, real mouse drag, Apply and edit-summary state. No uncaught page errors observed. Screenshots inspected at desktop/mobile across successful runs.

## Acceptance mapping

| Criterion | Evidence |
| --- | --- |
| AC1 mouse frame p95 <=33ms | Desktop: 458 samples, p95 16.8ms; mobile: 476 samples, p95 16.8ms. requestAnimationFrame intervals during 80 real Playwright mouse moves with button held. Local browser scheduling measurement, not a universal FPS guarantee or input-to-paint benchmark. |
| AC2 no incidental viewport reset | Graph tests assert no fit/focus or network recreation on visible-set/focus updates and preserve dragged coordinates. Explicit Fit remains available; first visible sizing fits once. |
| AC3 distinct types | Graph test asserts five unique shapes; visible legend matches box/ellipse/diamond/hexagon/dot. |
| AC4 no displayed codes | Graph test asserts name-only labels, no source codes; picker removes code suffixes from list/details. Code search retained. |
| AC5 membership versus focus | Graph test asserts check mark, border and color reset on deselection; inspecting calls selection without camera focus. |
| AC6 organized choices | Component and browser tests verify five counted collapsible groups and no repeated shared prerequisite item; existing dependency locks retained. |
| AC7 existing behavior | Picker tests cover Apply/Cancel, branch pruning, prerequisite locks, preview failure/retry, filters and oversize rejection. |

Artifacts: [final browser output](../../../frontend/test-results/catalog-refinement-final/). Each viewport directory contains screenshot and `mouse-frame-timings.json`. [Repeatable spec](../../../frontend/system-tests/REQ-060-catalog-refinement.spec.ts).

## Iterations and limitations

- Initial browser selector incorrectly searched the first all-type result page for a job outside that page: two timeouts, exit 1. Fixed test ordering; no product fallback.
- Intermediate mobile performance run measured p95 50ms and failed, exit 1. Packed the excessively tall node layout into bounded rows/type bands; subsequent packed and final browser runs both passed.
- New graph test initially lacked CSS variables, making all colors equal in jsdom; fixed test token fixture, not the assertion.
- No pristine pre-change baseline was captured, so no percentage speedup is claimed.
- Dense all-type view remains an overview: use filters and zoom for readable names. Edges temporarily hide during drag/zoom and reappear afterward to reduce rendering work.
- Final browser checks cover light theme and mouse drag at desktop/mobile viewport sizes, not touch-device hardware, dark-mode contrast certification or full onboarding reprovisioning. Historical onboarding tests are not claimed as new runs.
- Backend/integration/architecture checks not applicable to this frontend-only delta; no backend/data contracts changed.

## Manual checklist

1. Open the URL above; choose catalog. Confirm five type shapes and the legend.
2. Select a job branch. Confirm checked/thicker catalog nodes differ from the inspected node; zoom to inspect names without codes.
3. Drag background, drag an individual node, zoom and select/remove items. Confirm no unsolicited fit or focus jump; Fit deliberately restores overview.
4. Open/collapse each Your catalog type group; verify counts and required-item explanations. Remove a branch and verify counts update.
5. Cancel changes and reopen; applied choices remain unchanged. Apply changes and reopen; chosen items remain.
6. Repeat with a 390px viewport using Browse/Graph/Your catalog panels. Use filters to avoid the dense all-type overview when reviewing individual branches.
