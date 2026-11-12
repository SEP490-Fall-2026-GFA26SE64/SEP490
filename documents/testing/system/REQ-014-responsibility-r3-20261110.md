# REQ-014 — Assessment Bank responsibility and visual consistency

Local verification, 2026-11-10. Frontend slice for Expert/L&D Question Bank; no backend, schema, dependency or authorization changes. Earlier form/import verification remains in [R2](REQ-014-assessment-bank-ui-r2-20261110.md) and [form refinement](REQ-014-question-form-refinement-20261110.md).

## Implemented behavior

- Seven-column desktop directory and responsive cards expose actual question ownership, separately from creator/editor/submitter/reviewer. Search, existing filters, pagination and revision checks are retained. Latest update comes only from valid recorded version/audit timestamps. Null ownership is Unassigned; unknown present identity is Expert unavailable.
- Existing shared Dialog/Tabs/Button/Badge/FormField/RadioGroup/Toast components are reused. Tabs support arrow/Home/End keyboard navigation and associated panels. Question content and History & versions share a fixed authorized-action footer and an independent content scroller. Historical selection is retained between tabs. Exact-version VIEW acknowledgement still gates publication. Existing RETURN with reason remains the rejection workflow.
- Full question codes copy through the shared toast provider: success icon and “Copied to clipboard!” for 2500ms, truthful clipboard-failure feedback without browser alerts. Directory, drawer, draft editor, import-preview codes and approval feedback use the same control; absent optional import codes have no fabricated value.
- L&D assignment searches actual eligible Experts, shows current/selected responsibility, requires the existing reason and confirms one question at a time. Revision/error responses retain selection and reason. Bulk toolbar offers approval and clearing selection; no bulk assignment API is invented.
- API supplies names/IDs, not photos, expertise, workload or profile availability. Avatars therefore use actual-name initials, and Expert captions are shown only for eligible session Experts. Latest recorded assignment change is explicitly labelled; historical recipient profiles are not fabricated.

## Job Positions comparison

Audited `JobPositionsManagementPage.tsx`: shared CardTitle, muted uppercase header, primary name text-sm/semibold, compact metadata, outline icon buttons, shared semantic badges and tokens. Assessment Bank reuses those patterns. Its13px header follows the requested caption target; primary prompt uses the same text-sm as Job Positions. Root font is 15.5px (`base.css`), so shared h-10/w-10 buttons measure 38.75px square and text-sm measures 13.5625px. The reference source h-8 controls are nominal 32px; Assessment uses the user-requested 38–40px range. Knowledge-level column avoids breaking Intermediate between letters. No new palette or component system was created.

Live heading comparison passed: both directory headings 17.4375px, weight 600, identical IBM Plex Sans family. Actual Bank header 13px uppercase; action 38.75px square. **Full loaded-table comparison is unverified:** Job Positions remained loading after 45 seconds. Trace showed job-position responses 200 while department/member-related requests were unfinished when the page closed. No root-cause or backend fix is claimed. Source comparison and live heading/Bank measurements are distinct from this limitation.

## Actual verification

| Check | Result |
| --- | --- |
| Focused unit/component regression |36 tests /6 files passed, including all8 User Management cases |
| Real assignment |Passed: five eligible Experts; isolated UI-R3 draft transferred to a different owner; owner/history persisted after reload; former owner edit/submit controls absent |
| Responsibility/clipboard/assignment/timeline |Passed at 1440, 768, 390px; no horizontal overflow; real clipboard content, timed toast dismissal, distinct actors, chronological snapshots, 409 recovery and owner filtering |
| Compact directory regression |4 passed: real page/filter/focus preservation and permitted actions at 1440, 768, 390px |
| Final typography/action measurement |1 passed, with loaded-reference-table limitation above |
| Final production build / scoped Oxlint / diff check |Passed; existing large-bundle warning remains |

These are nine distinct passing browser cases across bounded runs. The three responsive responsibility cases use explicit test-only endpoint fixtures after real authentication; the assignment, persistence, directory and heading cases use real services. Test drafts have unique UI-R3-responsibility prefixes; no existing question was reassigned by the test. This is not backend/security-suite certification.

Historical failures are retained: initial metadata selector matched a name plus date and was corrected; an expanded43-case regression had one User Management loading timeout (42 passed), then the focused36-case retry passed; optional import-code typing was fixed before the passing build. Visual assertions initially assumed exact 40px/14px and were corrected to the existing rem-based tokens after inspecting base.css. The full loaded Job Positions comparison remains blocked, not Passed.

## Evidence and visual review

- [Final build](assets/assessment-bank-r3-final-polish-20261110/build.log), [lint](assets/assessment-bank-r3-final-polish-20261110/lint.log), [final browser measurement](assets/assessment-bank-r3-final-polish-20261110/browser.log).
- [Focused component log](assets/assessment-bank-r3-reference-verified-20261110/regression-verified.log), [real/responsive responsibility log](assets/assessment-bank-r3-reference-verified-20261110/responsibility-initial.log), [focus/responsive log](assets/assessment-bank-r3-reference-verified-20261110/focus-responsive.log). Those earlier aggregate logs retain their final reference-assertion failure; successful replacement is linked above.
- [Real Bank final desktop](assets/assessment-bank-r3-final-polish-20261110/1440/bank-reference-comparison.png), [reference loading state](assets/assessment-bank-r3-final-polish-20261110/1440/job-positions-reference-final.png).
- [Real assignment history](assets/assessment-bank-responsibility-r3-job-reference-20261110/1440/real-responsibility-history.png), [tablet assignment](assets/assessment-bank-responsibility-r3-job-reference-20261110/768/assignment.png), [mobile content/footer](assets/assessment-bank-compact-r3-20261110/390/panel.png), [mobile history/footer](assets/assessment-bank-responsibility-r3-job-reference-20261110/390/overview.png), [mobile toast](assets/assessment-bank-responsibility-r3-job-reference-20261110/390/copy-toast.png).

Manual screenshot review completed for desktop directory/history, tablet assignment, mobile content/history/footer and toast. Typography, surfaces, badges and action styling use existing tokens/components; no decorative orange modal border. Scrollers retain access to long content and footers stay visible. Loaded Job Positions table density could be assessed from source only, not a completed live table.

## Follow-up — exact Job Positions table-header size

User requested matching Job Positions instead of the earlier13px target. Assessment Bank column headers now use the same11px uppercase/600 treatment with normal letter spacing. Table body and mobile field labels retain their existing sizes. Browser measurement passed with bankHeader11px; build, scoped lint and diff check passed. Full loaded-reference-table limitation above still applies; the11px reference is verified in Job Positions source. [Browser evidence](assets/assessment-bank-header-11-20261110/browser.log), [build](assets/assessment-bank-header-11-20261110/build.log), [lint](assets/assessment-bank-header-11-20261110/lint.log).

## Follow-up — directory body typography

User requested matching row content to Job Positions. Directory now uses the same text-xs base for MicroSkill, knowledge level and metadata; primary prompt and responsible Expert name use text-sm. Prompt leading-snug matches the reference name styling. Shared badges retain their original text-xs. Compact ID/identity styling applies only to directory; detail/editor/assignment typography remains intact.

Browser measurement passed: body/code11.625px, prompt13.5625px and header11px, reflecting the existing15.5px root/rem scale. Knowledge-level cell matches the base size. Screenshot reviewed for readable hierarchy and unbroken level labels. Production build, scoped lint and diff check passed; existing bundle warning remains. Loaded Job Positions table remains unverified as above; styles are matched to its source and live heading. [Browser](assets/assessment-bank-body-match-20261110/browser.log), [screenshot](assets/assessment-bank-body-match-20261110/1440/bank-reference-comparison.png), [build](assets/assessment-bank-body-match-20261110/build.log), [lint](assets/assessment-bank-body-match-20261110/lint.log).
