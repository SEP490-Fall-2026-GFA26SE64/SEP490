# Learning Content — system evidence and manual checklist

Date: 2026-10-29. Status: **Local core verified; Vimeo live acceptance blocked**. Local URL: http://localhost:8088. Real workspace authentication; credentials remain in ignored `local/dev-accounts/ACCOUNTS.md`.

## Actual runs

- Final broad browser run: **7 passed / 2 failed**. Passing flows: full Text authoring/review/manual assignment/completion/version opt-in; atomic Excel preview/commit/duplicate rules; audited upload settings; cross-organization/private-file and peer-owner denials; ZIP Markdown/image/MP4 imports; in-app/local SMTP capture; actual YouTube playback/verification.
- MP4 follow-up exposed a real latency bug: position-only saves moved the timing anchor used to validate a buffered watched interval. V38 adds a separate coverage timing anchor; the regression unit and PostgreSQL integration tests passed. Final actual MP4 playback/90% rerun **passed** after V38: seeking to the end stayed ineligible, real playback enabled explicit completion, saved coverage met 90%, and reload retained completion. Final actual YouTube playback/staff-verification rerun also **passed**. Both focused video checks passed in one invocation (3.3minutes).
- A separate corrected notification rerun passed, including Employee NEW_VERSION email subject/recipient assertions.
- **Vimeo live acceptance blocked:** the old unlisted provider example returned metadata404 and was correctly rejected. Public example19231868 returned metadata200, but its embedded player displayed “We couldn't verify the security of your connection” and restricted content access. No connection-security/provider restriction was bypassed and no successful playback was fabricated. The player now times out into unavailable/retry state when an external embed never completes its handshake.
- Initial host resource starvation and5-second UI loading/metadata assertion failures are retained as failures, not accepted as successful runs. Loading assertions now wait for actual rendered/loaded state up to30seconds. Two simultaneous follow-up browser invocations also collided in their artifact directory; final verification uses a single invocation.
- MinIO is running using the optional official-source fallback after DockerHub/Quay retrieval failed and the archived binary URL returned410. Private MP4 upload, invalid-format denial, admission guards and range requests were exercised; final persisted 90% progress/reload passed after V38.
- Mailpit SMTP capture is available at http://localhost:28125. No real email was sent. This proves local delivery only, not live-inbox delivery or exactly-once SMTP semantics.

The dedicated local database migrated from V37 to V38 without resetting accounts, content versions or progress. Current focused backend 31 checks + 3 Testcontainers integration checks passed. Frontend 12 tests, typecheck, focusedlint and production build passed; existing bundle-size warning remains.

## Manual checklist

Prerequisites: approved local stack, private MinIO available, existing five role accounts, active same-organization Employee, at least one MicroSkill (new authoring no longer requires an Occupation grant). Use a second isolated organization to verify denials. Module assessments/AI pathway generation are outside this slice.

| Actor / URL | Steps | Expected result |
|---|---|---|
| Expert `/expert/modules` | Create module, add/reorder Text and Video lessons, save incomplete draft; try submit | Draft persists; incomplete content blocks submit with an actionable error. |
| Expert module editor | Format text with headings/list/table/code/link and uploaded image; preview | Preview retains supported content, no executable HTML or external image inclusion. |
| Expert module editor | Upload valid MP4/image, then wrong format or oversized file | Valid private asset works; invalid upload denied by backend settings. |
| Expert import section | Download template; import valid Excel/ZIP, inspect all rows; try missing file/invalid row | No module writes until confirmation; any error blocks the complete batch. |
| Expert import section | Import own released module, then another Expert's module or an unresolved draft | Own duplicate requires explicit new-revision confirmation; other cases reject whole batch. Cancel changes no modules. |
| L&D `/ld-manager/modules` | Open submitted revision, inspect every Text/Video, return with feedback or approve | Complete revision is reviewed atomically; publication preserves owner/editor/reviewer history. |
| Peer Expert | Open another Expert's module and attempt API mutation | Read-only preview/history; server denies mutation. |
| Expert assignment section | Choose released modules and an Employee; confirm pathway | Actual assignment and confirming actor/time persist; no AI recommendation evidence fabricated. |
| Employee `/employee/pathway` | Open assigned module, choose lessons freely | Only legitimate confirmed-pathway content is accessible. |
| Employee reader | Text: reach end; Video: watch distinct 90%, test seeking/replay; explicitly complete | Eligibility is enforced; no automatic completion; seeking/replay does not add unseen coverage. |
| Employee reader | Reload/sign out/device change, resume | Last lesson/video position and persisted completion/coverage return. |
| Employee reader | Stay on old version, then explicitly switch after a new approval | Old content/history remain; unchanged lessons retain progress, changed lessons reset. |
| Employee reader | Report unavailable video; inspect Expert notifications and captured email | Completion remains blocked, report reaches responsible Expert; new-version notice reaches affected learner. |
| Platform Admin `/platform-admin/learning-upload-settings` | Change limits; reduce below existing file size; try stale concurrent edit | New upload limits apply immediately, audit recorded; existing files work; stale write rejected. |
| Cross-organization user / private asset URL | Request foreign module, file, import preview/progress | Access denied without exposing private content. |

No automatic asset deletion job is installed. Automatic approval review rejected a proposed 24-hour heuristic cleanup because it could delete still-needed files; retained staging files are a known disk-usage limitation. Any future cleanup needs an explicitly approved safe reference/lifecycle policy.

## Safe visual evidence

Post-login captures only: [reader](artifacts/REQ-013-learning-content/REQ-013-learning-content-reader.png), [mobile](artifacts/REQ-013-learning-content/REQ-013-learning-content-mobile.png), [import](artifacts/REQ-013-learning-content/REQ-013-learning-content-import.png), [MP4](artifacts/REQ-013-learning-content/REQ-013-learning-content-video.png), [YouTube](artifacts/REQ-013-learning-content/REQ-013-learning-content-youtube.png). Raw login traces are not published as evidence.

Final aggregate across current relevant runs: **7 core flows passed + YouTube live passed; Vimeo live blocked**. This is not a claim that all9 live-provider checks passed in one green run. The latest MP4 and YouTube run passed2/2 after V38; the other6 core flows passed in the preceding broad run (notification assertion additionally passed a focused rerun).

R4 supersedes the old Occupation creation requirement and the combined revision-preview expander. See [R4 current browser/integration results and manual checklist](REQ-013-learning-content-R4.md).
