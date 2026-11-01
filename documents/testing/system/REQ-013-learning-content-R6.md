# REQ-013 / FR-06.06, FR-06.09 — R6 original UI, real assigned lessons

Date: 2026-10-29. Runtime: existing dedicated `sep490-accounts-dev` Compose stack and Vite at http://localhost:8088. R6 adds no database migration, seed, password reset, assignment creation or data deletion. During verification the development API stalled and its old process became a Docker zombie; ordinary restart failed, so only the API container was successfully recreated using the same image/jar/configuration. PostgreSQL, Neo4j and MinIO containers/volumes were preserved. Existing real R4 content/assignment/progress were retained.

## Acceptance and actual results

- **Earlier R6 revision passed (not a current final-source pass):** `R6 restores original pathway and lesson UI with real Text Video and persisted progress`, 2.2 minutes. Actual Employee login → select R4 assignment → original roadmap/module detail → original timeline → original reader/sidebar → Text/next lesson → private MP4 byte-range response (206, 16 requested bytes) → actual custom Play/Pause controls with increasing media time → persisted position → reload resumes the actual active Video lesson and position. Both page widths remain within a 390px viewport. No page errors were recorded.
- **Passed in an earlier invocation:** `R6 keeps pathway body blank on an empty result and recovers from a failed read`, 1.6 minutes. This is explicitly a UI response-fixture scenario: authenticated real Employee plus intercepted empty/503 pathway read, followed by removal of the interceptor and recovery to actual assignments. No persisted assignment was deleted. A later invocation reached the same empty assertion before the workspace finished reloading and failed its default five-second wait; bounded 30-second empty/error waits and explicit snapshot-load waits were added; later runs still hit runtime/global deadlines before the final source could be certified.
- **Current final-source verification: Blocked / incomplete.** Subsequent runs failed or were interrupted while the runtime stalled. An independent authenticated-API diagnostic could not get past the direct CSRF request within60 seconds, so no final full-stack completion is claimed. The selected-path loading refinement passes component tests but still requires a successful current real-stack rerun. Docker Desktop restart affects other stacks and has been requested from the user; no global restart has been performed.

The runtime body reads actual assigned snapshots only. Original diagram geometry scrolls inside its canvas on narrow screens; it does not create horizontal document overflow. Actual data replaces the prototype's module/skill/lesson text. Progress labels describe content completion, not verified mastery or passed exams. The original exam button is visibly unavailable because no real module-exam admission is implemented in this slice. Uploaded videos use the restored lesson controls; provider embeds retain their actual provider player.

## Browser procedure

```sh
SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-013-learning-content.spec.ts --grep 'R6 '
```

The dedicated existing demo is **R4 - Learning content practice** → **R4 - Lesson review cef9f873**, Module `MOD-e52f4286-6713-4426-b98d-24b02584bcc8`, assigned to `employee@example.test`. Credentials stay in the ignored private account sheet; they are not reproduced in evidence. First Text completion remains 1/3; the test played the actual Video and updated resume position without marking it complete or clearing historical progress.

Earlier attempts: initial actual MP4 metadata did not arrive within 30 seconds; subsequent play began buffering and did not advance within the initial 20-second wait. Final main scenario independently checks byte-range delivery, waits for actual playable media data, then verifies real media time and server/reload persistence. It does not replace playback with synthetic progress. API logs also recorded host thread starvation/slow health contributors; this observation is separate from the test failures and is not proof that every failure was environmental. A test-only TypeScript/readiness issue was corrected separately in unit evidence.

Logs: `/tmp/sep490-learning-content-R6-system-first.log`, `/tmp/sep490-learning-content-R6-system-playback-wait-failed.log`, `/tmp/sep490-learning-content-R6-system-main-pass-fixture-timeout.log`, `/tmp/sep490-learning-content-R6-system-final.log`. Do not publish failed-login traces/error contexts because they can include credentials.

## Manual checklist

| Actor / prerequisite | URL | Steps | Expected result |
| --- | --- | --- | --- |
| Existing Employee `employee@example.test`; actual R4 assignment | `/employee/pathway` | Select R4 - Learning content practice. | Original selector/mode-bar placement and orange module–skill roadmap appear with real assigned data. No sample Module, score or simulated diagnostic unlock appears. |
| Same Employee | `/employee/pathway` | Click the orange Module node; open/close details; inspect a skill node; switch Adaptive timeline. | Real lesson list/reader link and teaching metadata appear; timeline retains original pins/step cards and actual content progress. No fabricated mastery/prerequisite gate. |
| Same Employee | `/employee/modules/MOD-e52f4286-6713-4426-b98d-24b02584bcc8` | Open Introduction then Go to next item. | Original top navigation/progress/exam placement, left syllabus, large reading area and original next-item footer. Text comes from approved content; first completion remains persisted. |
| Same Employee; Video demonstration | Same reader | Use orange Play, Pause, seek slider, mute and speed controls. Reload after pausing. | Actual video responds; elapsed time is real, seeking cannot fabricate watched coverage, and the active lesson/position resumes. Existing 90% distinct coverage plus explicit completion rule remains. |
| Same Employee | Same reader | Inspect Take Module Exam. | Button is unavailable with a clear reason; no navigation to a fake exam. |
| Same Employee at 390px | `/employee/pathway` | Pan the roadmap horizontally within its canvas; open module details and lessons. | Canvas scrolls independently; page does not overflow; mobile lesson list stacks above content. |
| Employee with zero actual assigned pathways | `/employee/pathway` | Open either mode. | Pathway body is blank. No fallback sample, replacement empty card or contact-Expert CTA is shown. This condition is tested with explicit response fixtures rather than deleting local assignments. |
| Failed pathway/content load | Same routes | Retry after network recovery. | Loading/error state is separate from the blank success state; retry recovers without fabricated content. |

## Current gate record / recovery boundary

Frontend14/14, backend28/28, TypeScript, production build and scoped Oxlint passed. The unit result includes the final selected-path-only loading correction; an unavailable unselected Module is not requested and cannot block the visible pathway. Choosing another pathway performs fresh authorized reads, with no new cache or API contract.

API logs recorded repeated scheduler/clock starvation. A later ordinary API restart failed because the old container PID was zombie; force recreation of only the API succeeded. Vite was then restarted at the same localhost8088 proxy28180. A direct proxy CSRF check temporarily completed with a full136-byte body in0.54 seconds, but subsequent browser gates and a separate direct-API probe again timed out. These observations do not establish that every prior test failure was environmental: earlier readiness/default-five-second/whole-scenario timers were diagnosed separately, and no pass is substituted for a failed attempt.

Latest attempted run: `/tmp/sep490-learning-content-R6-system-final-validation.log`; stopped only this task's Playwright run while awaiting the user's decision about global Docker Desktop restart. Other retained attempts: `...-system-verified.log`, `...-system-recovered.log` (intentionally interrupted during Vite recovery), `...-system-clean.log`, and `...-system-selection-global-timeouts.log`. The180-second multi-reload scenario deadline was raised to360 seconds, matching the main real-stack flow; actual data/playback/persistence/width assertions remain.

A successful current full rerun is still required before marking R6 complete or publishing feature-completion outcomes. The temporary working brief is retained at `/tmp/sep490-learning-content-ui-R6.md`.

The current safely inspected mobile canvas artifact is [original roadmap after horizontal pan](artifacts/REQ-013-learning-content-R6/REQ-013-R6-pathway-mobile.png). Earlier desktop/reader/video images were visually inspected, but those temporary runner outputs were cleared by subsequent runs; they are not linked as retained evidence. R6 screenshot outputs now target the dedicated artifact directory directly to survive runner cleanup.

## Final recovery and current-source result — 2026-10-29

**Passed.** The user explicitly authorized Docker Desktop restart. `docker desktop restart --detach` completed; the existing project was reopened with both compose.accounts-dev.yml and compose.learning-source-dev.yml, the same private environment and preserved volumes. No image rebuild, reset, prune, seed or data deletion was performed. The API CSRF read then completed through localhost:8088 in0.19 seconds.

The current source passed all three R6 Chrome scenarios: real pathway/Text/Video/resume1.5 minutes; empty/error/recovery24 seconds; mobile original canvas/real lessons19 seconds (3 passed,2.4 minutes total). Log: `/tmp/sep490-learning-content-R6-system-after-desktop-restart.log`. Screenshot inspection identified that the Text image was captured while sanitization was loading; an explicit assertion for the real persisted Text was added before capture. The stronger main flow passed again in41 seconds (47.7-second invocation): `/tmp/sep490-learning-content-R6-system-reading-ready.log`. No application code changed between these two runs. Earlier Blocked/failed records above remain historical; this successful current-source verification closes that gate.

Inspected retained screenshots: [roadmap](artifacts/REQ-013-learning-content-R6/REQ-013-R6-roadmap.png), [timeline](artifacts/REQ-013-learning-content-R6/REQ-013-R6-timeline.png), [actual Text](artifacts/REQ-013-learning-content-R6/REQ-013-R6-reading.png), [actual Video](artifacts/REQ-013-learning-content-R6/REQ-013-R6-video.png), [mobile reader](artifacts/REQ-013-learning-content-R6/REQ-013-R6-reader-mobile.png), [mobile roadmap](artifacts/REQ-013-learning-content-R6/REQ-013-R6-pathway-mobile.png). The mobile-only player capture can precede media metadata; actual playable media and persistence are separately asserted in the main flow. Browser page-error assertions passed. Empty/error cases are explicit response fixtures; real content/playback/persistence use the actual Compose services.

All required R6 gates are now passed: frontend14, backend28, TypeScript/build/scoped lint and three real-stack UI scenarios. Integration remains N/A for this frontend-only slice as explained in its dedicated evidence. This is local verification; generated pathways, final exams and the pre-existing live-provider acceptance limitation are outside R6. Use the manual checklist above at http://localhost:8088/employee/pathway.
