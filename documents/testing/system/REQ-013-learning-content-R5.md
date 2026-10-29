# REQ-013 / FR-06.06, FR-06.09 — R5 real assigned Module in restored pathway UI

Date: 2026-10-29. Scope: local Learning Content integration, retaining the previous roadmap/timeline presentation. Adaptive/generated pathways remain outside this slice.

## Runtime and acceptance

URL: http://localhost:8088/employee/pathway. Existing dedicated `sep490-accounts-dev` Compose stack, including PostgreSQL, Neo4j, private MinIO and SMTP capture; Vite serves the canonical URL. Private settings/passwords remain in ignored `local/dev-accounts/` files and are not reproduced here. No account reseed, password reset, image rebuild or data-volume reset is required.

Browser test: `frontend/system-tests/REQ-013-learning-content.spec.ts`, scenario `R5 restores roadmap and timeline with a real assigned R4 module and persisted learning`.

Final browser status: **Passed**, one real Compose scenario, 1.2 minutes (runner total 1.5 minutes), zero test failures in the final invocation. Assertions retained: Expert cannot use Employee preview (403); exact real module title/skills; both view modes; explicit Text completion and reload; matching completed-lesson count on return; mobile document width does not exceed viewport; no page errors or unexpected Module-management request failures.

The test assigned the existing released **R4 - Lesson review cef9f873** to **Dev EMPLOYEE / employee@example.test**, using the existing Expert confirmation UI. Retained assignment title: **R4 - Learning content practice**. Repeated runs reuse this assignment rather than creating duplicates. Module ID: `MOD-e52f4286-6713-4426-b98d-24b02584bcc8`. The first of its three lessons (Introduction) was explicitly completed during testing; progress remains **1/3 (33%)** so the user can inspect persistence and continue with the other lessons. No new lesson package, Module release or account was seeded by R5.

```sh
SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-013-learning-content.spec.ts --grep 'R5 restores'
```

Safe screenshots were visually inspected and copied locally:

- [Roadmap](artifacts/REQ-013-learning-content-R5/REQ-013-R5-roadmap.png)
- [Timeline](artifacts/REQ-013-learning-content-R5/REQ-013-R5-timeline.png)
- [Mobile](artifacts/REQ-013-learning-content-R5/REQ-013-R5-mobile.png)

Final run log: `/tmp/sep490-learning-content-R5-system.log`. Earlier attempts are retained as `/tmp/sep490-learning-content-R5-system-startup-failed.log` (CSRF 502 while API was starting; sign-in response wait eventually timed out) and `/tmp/sep490-learning-content-R5-system-mobile-failed.log` (real tab-label overflow at 390px). The latter was fixed with compact mobile labels and full accessible names; the width assertion was not removed or weakened. Failed-login trace/context artifacts can contain credentials and must not be published.

R5 does not re-certify external providers, adaptive algorithms, mastery or exams. The browser scenario exercises Text completion; Video completion is a manual regression step below, with prior private-video coverage recorded in R4 evidence.

## Manual test checklist

| Actor / prerequisite | URL | Steps | Expected result |
| --- | --- | --- | --- |
| Expert `expert@example.test`; released module `R4 - Lesson review cef9f873` exists | `/expert/modules` | Open Assign a learning pathway; choose Dev EMPLOYEE and the released R4 module; confirm a named assignment if it is not already assigned. | Real same-organization assignment persists. No duplicate is needed if the retained R4 assignment already exists. |
| Employee `employee@example.test`; sign in through existing login | `/employee/pathway` | Open the R4 assignment in Interactive roadmap. | Original module–skill graph arrangement is restored, with actual Module title, skills, duration and content progress. No diagnostic unlock/demo generation or invented mastery/score is shown. |
| Same Employee | `/employee/pathway` | Switch Learning timeline; follow Start learning / Continue learning / Review lessons. | The same assigned Module appears in the timeline and opens the real lesson reader. Display order is Expert-confirmed, not a prerequisite or algorithm claim. |
| Same Employee; first Text lesson | `/employee/modules/<assigned-module-id>` | Read to the end, explicitly mark complete, reload, then return to pathway. | Completion remains saved for that content version; roadmap/timeline counts match completed lessons. |
| Same Employee; Video lesson | Same module reader | Play actual video; seek ahead without watching; then watch at least 90% distinct coverage and explicitly mark complete. | Seeking alone cannot complete video. Existing reader completion/resume rules remain; content completion does not imply exam pass/mastery. |
| Same Employee, 390px-wide viewport | `/employee/pathway` | Switch both modes, inspect wrapping and open the Module. | No horizontal page overflow; skills stack on small screens and learning actions remain usable. |
| Empty/error state (component fixtures cover reproducibly) | `/employee/pathway` | For an Employee without assignments, open page; for a failed load, retry when network returns. | Helpful contact-Expert/refresh empty state; explicit error and retry; no fallback mock Modules. |

Do not change/reassign production data for this checklist. The local R4 demo and its assignment remain available for the user after testing.
