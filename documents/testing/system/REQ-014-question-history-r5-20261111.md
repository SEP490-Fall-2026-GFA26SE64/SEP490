# REQ-014 — History & Versions R5 verification

Local UI refinement, 2026-11-11. Existing APIs/business rules/roles and the Content tab, directory, draft/import presentation and footer workflows remain intact.

## Reuse and files

Reused Job Positions patterns built from shared Dialog, Heading/Text, Button, Badge, native select and neutral metadata grids; existing Tabs/Accordion/QuestionId/QuestionContentPreview and Lucide icons remain the owners. No new UI component or dependency was created. Added a scoped questionHistory.css stylesheet using existing font/theme/color variables; it does not replace the design system or fonts globally.

Application files: shared/components/question-bank/QuestionBankWorkspace.tsx and questionHistory.css. Updated nearby QuestionBankWorkspace component tests, the existing REQ-014-question-details-r4.spec.ts regression with R5 typography/timeline checks, and snapshot labels in REQ-014-responsibility-directory.spec.ts. Affected Assessment workflows README outcomes updated separately.

## Outcome and data limitations

Selector and actual selected-version badge sit together; duplicated selected-version descriptions and option status text are removed. The selector identifies latest versus historical versions. Creator/editor/submitter/reviewer use a compact two-column grid; missing identity values use an em dash. Font family remains IBM Plex Sans. Browser measurements at 1440/768/390: section heading 15.5px, primary values/action titles/snapshot question 13.5625px, labels/dates 11.625px, matching Job Positions text-base/text-sm/text-xs with the existing 15.5px root.

Events show an accurate action description, Performed by, affected question/resolvable version, actual timestamp, optional labelled note/reason and actual stored snapshot. Mostly neutral icons are used, with restrained approval/return accents. Requests are not labelled as applied status changes; RETURN is Returned for changes, not a new terminal Rejected state. Unknown codes stay visible with neutral contextual wording.

BankAudit has no old/new assignee fields and uses ASSIGNED for both assignment and reassignment. The UI therefore says Responsibility updated and explicitly marks the historical recipient unavailable with an em dash/context. It never substitutes the current owner, derives initial/reassignment from incomplete event order, parses a recipient from free text, or invents a content version. This prevents full person-target reconstruction; no API/schema expansion or historical backfill is claimed.

View question snapshot has a visible description, distinct accessible label/description, expanded background and keyboard focus. It shows the exact stored snapshot and retains existing correct keys, missing-content handling and wrapping. Scoped typography makes historical preview compact without altering the other preview consumers.

## Actual checks

- 39 component tests, production build, scoped lint and diff check Passed.
- Three responsive browser cases Passed: 1440,768,390px; actual font sizes above; no document/drawer/scroller horizontal overflow; long multi-line/unbroken answer text; version selection across tabs; actor/target/recipient truth; Enter expand/collapse, arrow-key tabs, clipboard/toast and fixed footer.
- Expert footer/action regression Passed, including confirmation/cancel/error, required reasons, successor/availability requests, retired filter and peer restrictions.
- L&D action regression and real authenticated read-only Bank/content/history Passed in the final recovered two-case run. In total six distinct browser cases passed across bounded runs, with no domain mutation in real-data checks. UI action matrix uses isolated Bank endpoint fixtures after real authentication; auth/CSRF/entitlement guards and the final real read used normal 8088 services. No pageerror in passing cases.

Initial full browser run: four passed; L&D final action exceeded the default 5-second assertion while a real CSRF response took 5911ms, and the real read subsequently timed out at Workspace access. Bounded dialog-close waits now allow 45 seconds (the existing Bank request budget remains 30 seconds); assertions and application behavior are unchanged. The first isolated L&D retry reached later actions but timed out during navigation as runtime degraded. Both direct/proxy CSRF checks then timed out 8 seconds despite containers still running.

Verified existing Neo4j settings: heap max 512m, initial 256m, page cache 256m; both OOMKilled=false in this incident. Restarted existing Neo4j, waited healthy, then restarted existing API under earlier operational authorization. Configuration/images/volumes and package manifests were retained; no database reset or migration. Proxy returned 200, and sequential L&D plus real-read retry passed. This recovery does not certify sustained runtime performance; the separate R4 OOM incident remains historical, not reclassified as R5.

## Evidence

[Initial browser results](assets/assessment-bank-history-r5-20261111/browser-initial.log), [first isolated L&D runtime failure](assets/assessment-bank-history-r5-20261111/browser-ld-runtime-failure.log), [final two-case pass](assets/assessment-bank-history-r5-20261111/browser-recovered.log), [component/build/lint](../unit/REQ-014-question-history-r5-20261111.md).

Manual review: [desktop history/snapshot](assets/assessment-bank-history-r5-20261111/1440/history-snapshot.png), [mobile history/snapshot](assets/assessment-bank-history-r5-20261111/390/history-snapshot.png), and actual read screenshots in [recovered real history](assets/assessment-bank-history-r5-recovered-20261111/1440/real-history.png). Observed compact grouping, visible focus/expanded state, correct snapshot answer key and fixed actions. Raw traces remain in temporary Playwright output; prior R4 and R5 runs are preserved.
