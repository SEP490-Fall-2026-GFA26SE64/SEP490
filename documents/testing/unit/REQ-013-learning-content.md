# Learning Content — unit and component evidence

Date: 2026-10-29. Scope: FR-05.05/05.08/04.06, content/progress portion FR-06.08/06.09, and confirmed manual pathway support. Focused automated checks are complete; browser/provider acceptance is recorded separately in the system evidence.

| Check | Actual result |
|---|---|
| Focused backend suite: `LearningContentTest,LearningContentServiceTest,PrivateLearningAssetsTest,ModuleAuthoringServiceTest,HexagonalArchitectureTest` | **31 passed**: 3 domain, 8 learning service, 4 private-media/import safety, 13 existing Module service, 3 architecture. |
| Restricted JVM run | Environment failure: Mockito could not attach its agent. Host-approved rerun passed. |
| Vitest: Module workspace + concurrent CSRF retrieval | **12 passed**, final rerun. |
| TypeScript build | **Passed**, final rerun. |
| Focused new-file lint | **Passed**, zero warnings. |
| Vite production build | **Passed**, final rerun. Existing application bundle-size warning remains; rich editor is loaded separately. |

Assertions include distinct watched-interval merging (replays do not add coverage), deceptive-provider URL denial, legacy Markdown conversion, no automatic completion at 90%, explicit completion gating, wrong-version denial, unauthorized assignment/private file access, and existing owner/review/history behavior. The later passing run also covers actual pathway admission before pin access and progress carry-over only for unchanged stable lesson identities.

Runtime mocks were removed from the active reader and its unused legacy content store. Unit fixtures/mocked ports are isolated test doubles; they do not establish actual MinIO/provider/browser acceptance.

Transport follow-up: Node24 Vitest workspace/component + concurrent-CSRF retrieval tests **12 passed**. Concurrent mutations share only an in-flight token request; completed tokens are not cached across subsequent operations/login changes.

Additional assertions cover exact fractional MP4 duration, private asset checksum comparison across versions, Vimeo unlisted hash preservation, safe lesson IDs, and sanitized text rendering.

Latency regression: position-only heartbeats preserve the coverage timing anchor; a buffered valid5.055-second segment is accepted while an implausibly fast14-second segment remains rejected. Current 31-unit/3-integration combined rerun passed after V38.
