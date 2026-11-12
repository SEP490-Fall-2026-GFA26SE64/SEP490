# REQ-014 compact directory and right detail panel — 2026-11-10

## Scope and environment

Existing shared Question Bank UI on http://localhost:8088. Rows retain code, at most two prompt lines, Skill and state. One overflow trigger exposes the same authorized actions. Existing detail/version/history content is reused in the shared Dialog aligned as a right-side panel; the panel fills small screens. Version, knowledge level and responsibility metadata remain available there. No API, schema, model, permission, page-size or sorting change. No new left-hand Skill sidebar. Existing Radix Popover dependency is reused; no dependency added.

## Actual results

| Check | Result |
| --- | --- |
| Component regression + compact/panel cases | Passed: 19 tests, 2 files. `npm test -- src/shared/components/question-bank/__tests__ --maxWorkers=1 --testTimeout=15000`. First default-timeout attempt had 18 passes and one 5-second timeout; 15 seconds was used on the resource-constrained host. |
| Frontend production build | Passed after the popup event-order fix. Existing bundle-size warning remains. |
| Scoped Oxlint / diff whitespace | Passed. |
| Real local directory/panel journey | Passed: 35.4 seconds, 1440×1000. Sample row height <=112px, second-page navigation, correct full-height right alignment, version selector, close/focus restoration, scroll position within2px and search/page preservation. No JavaScript page errors. Read-only; no question writes. |
| Final presentation at 1440×900 | Passed: 18.5 seconds. |
| Final presentation at 768×900 | Passed: 16.6 seconds. |
| Final presentation at 390×900 | Passed: 14.6 seconds. |

Final responsive popup-fix run: **3 passed (55.2 seconds)**. Three cases authenticate real Expert/L&D accounts but use explicit Question Bank fixtures (21 questions) to cover dense rows, no document overflow, keyboard Enter/Escape, owner Edit/Submit availability, read-only peer restrictions, details opened from overflow, focus returned to the overflow trigger after panel close, and L&D assignment/bulk-selection controls. These are presentation/permission-rendering checks, not backend authorization certification. Runtime application continues to call real APIs.

The separate real read-only journey used the actual local bank and no Question Bank fixtures. [Real directory](assets/assessment-bank-compact-20261110/1440/real-directory.png), [real panel](assets/assessment-bank-compact-20261110/1440/real-panel.png). The later code fix affects overflow event order only; the real journey used direct question-title opening and remains applicable.

## Failures preserved and recovery

- First browser run blocked by `/api/v1/workspace-auth/current` HTTP502. Docker inspection showed API exit137/OOMKilled and unhealthy Neo4j.
- Next run could not connect to localhost8088; web had also been OOM-killed. Existing API, Neo4j and web containers were started again under the prior local stack recovery authorization; no RAM settings, volumes, images, migrations or data were reset/changed. API/Neo4j became healthy and8088 returned200. The machine's recurring memory pressure remains an operational limitation, not fixed by this UI slice.
- After recovery, real data reading/panel state passed, but overflow Details failed because closing during capture prevented the target action from running. The handler was moved to bubble order; focus is restored to the connected source trigger before the new dialog captures focus, and Popover's automatic return-focus is suppressed only for chosen actions.
- The final three presentation cases passed after this fix. Earlier screenshots/logs remain; failed auth-bearing raw traces stay under `/tmp/sep490-assessment-bank-ui/` rather than tracked evidence.

[Initial runtime failure](assets/assessment-bank-compact-final-20261110/runtime-502-run.txt), [web recovery failure](assets/assessment-bank-compact-final-20261110/web-unavailable-run.txt), [real pass / popup failure](assets/assessment-bank-compact-final-20261110/real-read-and-popup-failure.txt), [fixed run](assets/assessment-bank-compact-final-20261110/popup-fixed-responsive.txt).

## Visual inspection

Inspected actual-bank directory/panel captures, final desktop directory/action popup, tablet panel and mobile directory/panel. Metadata/answers/history remain available in the panel. Row prompts are clipped for the compact list only; the full text stays in the panel. Existing keyboard focus indicators remain visible. Final assets: [1440](assets/assessment-bank-compact-final-20261110/1440/), [768](assets/assessment-bank-compact-final-20261110/768/), [390](assets/assessment-bank-compact-final-20261110/390/).

## Manual checklist

1. Sign in as an entitled Expert and open `/workspace/workspace-development/expert/assessment-bank`. Inspect compact rows and click a prompt to open details.
2. Change page/search/filter, open and close the panel using Close, Escape or the backdrop; verify list state and focus return without losing scroll position.
3. Open overflow with keyboard Enter. Details opens the panel; owner-only Edit/Submit/lifecycle controls follow existing state/permissions. A peer must not gain Edit/Submit.
4. Inspect version, knowledge level, responsible Expert, answer/explanation and history in the panel. Existing explicit exact-version review acknowledgement remains required for L&D approval.
5. Sign in as L&D and verify assignment and bulk selection remain accessible; authoring controls remain absent.
6. Repeat at1440/768/390 widths; confirm no document overflow and right-side/full-width panel as appropriate.

Commands (frontend cwd): `npm run build`; scoped `oxlint`; the component command above; `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH=<installed Chrome> npx playwright test --config=playwright.system.config.ts REQ-014-compact-directory.spec.ts`, followed by `--grep presentation` after the popup-only fix. Existing client-side filtering/20-row pagination remain unchanged; server-side pagination/virtualization were not introduced. Existing create/import flows were not rewritten and their component regressions remain enabled.
