# REQ-013 — ZIP/Word import manual checklist, 2026-11-18

Browser/Playwright: **Not Run**, following the user's explicit standing choice to inspect the interface personally. No live deployment, running API restart, actual user-module import, screenshot, network or console pass is claimed.

Use the actual local workspace's `/expert/modules` route (normally localhost:8088) after building/updating the API to this source. The existing running API was not replaced by this coding task. Prerequisites: an authenticated Expert with an active paid workspace, at least one active approved Skill/knowledge level configured for module learning, and configured private media storage. L&D Manager cannot import.

1. In English and Vietnamese, open Import and verify the control says ZIP, not standalone Excel/RAR. Download the template and inspect the attachment filename/module.xlsx plus VI/EN guides and real lesson/video files.
2. Confirm the workbook contains Modules, Lessons, HuongDan, InstructionsEN and DanhMuc, with organization Skill codes, dropdowns, positive number validation and duplicate/ref highlight rules. No JSON teaching array or inline Markdown/text column is required.
3. Upload the unmodified downloaded sample. Review must show two modules/four lessons without errors. Open each learner preview, inspect converted Word/table formatting and play the referenced MP4; returning to Review does not confirm import.
4. Confirm on a dedicated test batch. Reload and inspect both drafts, their lessons, private media and importing owner. Existing modules and publication/review status must not change. Confirm the same batch again cannot create duplicates.
5. Remove/rename a referenced file, change a Skill/code/level, duplicate a reference/order or link to an unknown module. Upload again: errors identify relevant rows and confirmation stays disabled. No partial module/content batch is created.
6. Try standalone XLSX/RAR, the old JSON/Markdown template and an old stored preview. Expect a current-template/reupload message. A failed upload must allow choosing another ZIP.
7. Try a Word file with a normal embedded image and verify private image display. Try unaccepted tracked changes, external images, equations, merged tables or text boxes and verify a clear row error. Preserve unsupported content manually before reimporting.
8. Verify foreign organization/other Expert cannot confirm a preview and L&D cannot upload a batch. Check desktop/mobile dialog scrolling, long filenames, focus/error feedback and busy controls.
9. If no eligible Skill scope exists, template download must report the setup requirement rather than inventing a Skill. Supply a valid organization Skill before retrying.

The generated example ZIP is at `outputs/module-import-template-20261118/module-template.zip`; it uses an isolated test Skill fixture. Normal user download derives choices from the active organization. Automated checks and persistence limits are [documented separately](../unit/REQ-013-zip-word-import-20261118.md).
