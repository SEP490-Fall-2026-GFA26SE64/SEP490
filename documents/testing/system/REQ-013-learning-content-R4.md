# REQ-013 — R4 browser evidence and manual checklist

2026-10-29. Local URL: http://localhost:8088. Status: **R4 local slice verified**.

## Actual browser runs

- First broad invocation stopped after environment/auth/catalog delays; not accepted as a pass.
- A focused R4 run timed out reading MicroSkill before creating a Module. Another invocation passed **2/3**: Excel import and real organization/owner isolation passed; R4 created/submitted three lessons but reached its total 240-second timeout while signing in as L&D.
- Excel verification includes a new template without occupationIds, explicit owned-duplicate confirmation, rejection of unresolved drafts, and acceptance of the old optional column as inert input even when its value is not a current Occupation.
- Isolation verification includes real same-organization peer mutation/import denial and foreign-organization private content/file denial. Temporary fixture accounts were deactivated by the test cleanup.
- Final focused R4 run keeps all content/playback/approval assertions, removes a redundant raw MicroSkill fetch because the form already loads actual choices, and uses a360-second total budget for the slow local environment. Its final result is recorded below.

## Manual checklist

Prerequisites: running local stack/private MinIO, an active Expert and L&D account in the same organization, at least one MicroSkill and a valid H.264 MP4. New authoring does **not** require an Occupation selection/grant. Credentials remain in ignored local/dev-accounts/ACCOUNTS.md.

| Actor / URL | Steps | Expected result |
|---|---|---|
| Expert http://localhost:8088/expert/modules | Create Module; inspect fields; enter title/type/duration/price, select one primary skill; add two Text lessons and one uploaded MP4 Video; save/submit. | No Occupation field or permission gate; valid skill/content fields persist. |
| Expert http://localhost:8088/expert/learning-content | Create content or copy existing lessons into a new Module. | No Occupation selection/filter. Existing content remains immutable; new snapshot belongs to the authenticated creator. |
| L&D http://localhost:8088/ld-manager/modules | Search newly submitted Module, open Details & history. | Each revision directly shows Lesson1/2/3 (Bài học1/2/3), title, Reading/Video, duration and individual content cards; no combined Preview this content version expander. |
| L&D details | Read both Text lessons; scroll to/play uploaded video; resize to mobile; close and approve/release. | Actual sanitized content/video works, numbered cards stay readable, navigation stays L&D and the whole revision is approved. |
| Expert import section | Download fresh template; import Excel/ZIP with no Occupation; preview/confirm. | Complete batch validation and duplicate/owner rules remain; legacy optional occupation column is ignored. |
| Peer / foreign organization | Read same-organization module, attempt mutation/import; request foreign content. | Peer remains read-only; foreign private data denied. Occupation membership does not grant edits. |
| Existing module owner | Edit module with historical occupation metadata using current form. | Old tags/history preserved without requiring matching scope; one responsible Expert remains. |

Legacy catalog intake assignment/permissions remain a separate pre-existing workflow; their controls are labeled intake-only. R4 does not migrate or delete their audit records.

Raw login traces/screenshots are not published. Safe post-login visual evidence will be linked only after inspection.

Follow-up diagnosis: after the longer budget, R4 reached L&D details and passed all three lesson-region and both Text-body assertions. Video metadata timed out even though GET returned206. Backend logs revealed AuthorizationDeniedException during ASYNC redispatch after the response was committed. The filter fix rechecks the real session on that dispatch; its 11 security/API tests passed, and local browser verification after deployment passed as recorded below. The preceding timeout is a real media defect, not classified solely as environmental delay.

## Final browser result after async-session correction

**2/2 passed** in one 3-minute invocation: private MP4 admission/range/actual 90%/explicit completion/reload, and the complete R4 UI create 3 lessons→submit→L&D direct review/playback→mobile check→approve/release journey. The R4 case itself passed in 1 minute. Together with the preceding Excel/organization-isolation results, all 4 relevant browser scenarios have passing current R4 coverage; they were not run as a single four-test green invocation.

The real review demo is **R4 - Lesson review cef9f873** (released by the authenticated test L&D account). It contains Introduction, Guided practice and Video demonstration. Search R4 at http://localhost:8088/ld-manager/modules and open Details & history.

Inspected safe post-login captures: [desktop video lesson](artifacts/REQ-013-learning-content-R4/REQ-013-R4-numbered-lessons.png), [mobile Text/Video lessons](artifacts/REQ-013-learning-content-R4/REQ-013-R4-numbered-lessons-mobile.png). Actual MP4 frame/player and numbered cards are visible; no login credentials are included.
