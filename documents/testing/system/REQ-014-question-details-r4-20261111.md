# REQ-014 — Question Details R4 browser verification

Local run started 2026-11-10 and completed 2026-11-11. Applies to the Expert/L&D Question Bank subset in [Assessment workflows](../../features/Assessment%20workflows/README.md). This is UI verification, not production/backend certification.

## Reuse and source comparison

Inspected JobPositionsManagementPage imports, headings/statistics/directory, action buttons, search/status filters, detail modal and authoring fields/validation. It reuses shared Dialog/Card/Button/Input/Badge and toast, with compact text-xs metadata, text-sm primary values, neutral borders, internal scrolling and fixed footer. Its native select is locally implemented; shared UI has no equivalent Select or Avatar primitive.

R4 reuses Dialog/Body/Header/Footer, Tabs, Accordion, Badge, Button, Heading/Text, native select, existing toast/QuestionId and ResponsibleExpert. Existing QuestionContentPreview gains a details presentation; its default draft/import presentation stays intact. QuestionId gains compact full-text presentation instead of removing the complete code. No duplicate UI primitives, dependencies or new design system were added. Existing directory header/body/action alignment changes are retained. Job Positions reference is source-based; the older live loaded-table comparison is not recertified by R4.

## Resulting behavior

Question content contains four sections: two-column overview with subdued copyable ID; labelled responsibility with actual name initials/eligible Expert caption or honest unavailable-role/unassigned context; prompt-focused answer content with one actual correct key, green indicator/check and graceful empty explanation; separate assessment configuration. Baseline wording explains that the mandatory flag does not apply to its separate selection policy, without claiming the question is excluded. This matches BaselinePolicyEditor mandatory validation and ScopedAssessmentPolicyService baseline mandatory count handling.

History & versions shows a compact selector, actual selected-version state and distinct creator/editor/submitter/reviewer metadata. Nullable records use a dash. Chronological activities distinguish assignment/edit/submission/approval/return, with actual actor/time/notes. View version snapshot opens only the associated stored snapshot; captions identify the existing version when resolvable. Assignment does not invent another content version or historical recipient profile.

Header/tabs/footer remain outside the independent scroller. Drawer Submit and Approve now confirm before calling the existing command API, with no new reason requirement. Other reason-bearing actions retain their existing validation. VIEW acknowledgement still gates exact-version approval; row submission and bulk behavior remain unchanged. Error/cancel preserves content and selection; peer controls remain absent.

## Actual verification

| Case | Result |
| --- | --- |
| Detail hierarchy/snapshots at 1440×900 |Passed |
| Detail hierarchy/snapshots at 768×900 |Passed |
| Detail hierarchy/snapshots at 390×900 |Passed |
| Expert footer/action sequence |Passed in targeted retry after test-filter correction |
| L&D footer/action sequence |Passed |
| Actual authenticated Bank read/content/history |Passed, real endpoint 200, no Bank fixtures |
| Component regression |34 tests / 5 files Passed |
| Final production build/scoped lint/diff check |Passed; existing bundle-size warning remains |

Six distinct browser cases passed across bounded runs: the restored suite passed five cases and the corrected Expert case passed separately. No broad repeat was needed after the test-only retired-filter correction.

Responsive checks include two metadata columns, long multi-line and 160-character unbroken answer text, no document/drawer/scroller horizontal overflow, correct-key presentation, explicit missing explanation, real clipboard content and timed toast dismissal. Arrow-key tab navigation and Enter on snapshot accordions work. Version selection persists when switching tabs; historical content and the latest-version action note remain distinct. Footer bounds and fixed tab position are checked after scrolling to configuration. No pageerror was recorded in passing cases.

Expert coverage: edit/cancel, submission confirm/cancel,409 error retention and retry, withdraw with required reason, successor creation, retirement/reactivation requests, no submission while retired, and peer read-only controls. L&D coverage: disabled approval before VIEW, acknowledgement, approval confirmation/cancel, publish, return with reason, searchable reassignment and availability return/confirmation. Five cases use explicit test-only Bank endpoint fixtures after real authentication; the sixth uses real read-only Bank data. R4 tests performed no persistent question mutation and do not validate server mutation/persistence logic.

## Historical failures and local runtime recovery

The initial run passed three responsive cases, then Expert was blocked on Workspace access loading before reaching Bank; one later case was interrupted and one did not run. Proxy CSRF timed out while a direct API read succeeded. A subsequent retry failed to connect: both existing API and Neo4j containers had exited 137 with State.OOMKilled=true. These are blocked runtime checks, not UI passes.

Restarted the existing Neo4j container, waited for health, then started the existing API. Direct API CSRF returned 200 in ~0.2s, but the existing dev proxy still timed out. Restarted the existing web container; its unchanged entrypoint ran npm ci/dev startup. Normal 8088 CSRF returned 200 afterward. Container images, runtime configuration, volume attachments and package manifests were retained; no schema migration or data reset was performed. The final passing browser runs used the normal 8088 path, real auth/CSRF/subscription guards, with no alternate API routing retained. This recovery is not a memory-capacity fix or long-term runtime stability certification.

After recovery, five cases passed; Expert reached the retired branch but its test searched the default list, which intentionally hides retired questions. Corrected the test to choose Retired using the existing Filter status control. A short selector-correction retry was interrupted and retained separately; the final Expert run passed. Application filtering/business rules were not changed. Raw auth-bearing traces stay in the temporary Playwright output directories.

## Evidence and manual review

- [Restored five-case success plus retired-filter test failure](assets/assessment-bank-details-r4-verified-20261111/browser-restored.log), [final Expert pass](assets/assessment-bank-details-r4-verified-20261111/browser-expert-verified.log).
- [Initial runtime-blocked run](assets/assessment-bank-details-r4-verified-20261111/browser-initial-runtime-blocked.log), [API-outage retry](assets/assessment-bank-details-r4-verified-20261111/browser-api-outage.log), [interrupted selector retry](assets/assessment-bank-details-r4-verified-20261111/browser-selector-interrupted.log).
- [Desktop real content](assets/assessment-bank-details-r4-verified-20261111/1440/real-content.png), [real history](assets/assessment-bank-details-r4-verified-20261111/1440/real-history.png), [tablet snapshot](assets/assessment-bank-details-r4-verified-20261111/768/history-snapshot.png), [mobile content/footer](assets/assessment-bank-details-r4-verified-20261111/390/content-bottom.png), [submission error retention](assets/assessment-bank-details-r4-expert-final-20261111/1440/submission-conflict.png).
- [Component/build/lint evidence](../unit/REQ-014-question-details-r4-20261111.md).

Manual screenshot review completed for real desktop content/history, tablet snapshots and mobile long-content/footer. Confirmed readable hierarchy, neutral surfaces/borders, focus on controls rather than decorative modal borders, a green correct-key indicator, naturally wrapping answers, clear empty explanation, separate assessment configuration, and visible footer actions. API/Neo4j/web were left running after local recovery; [final readiness](assets/assessment-bank-details-r4-verified-20261111/runtime-recovered.log) records healthy API/Neo4j and normal 8088 CSRF 200.
