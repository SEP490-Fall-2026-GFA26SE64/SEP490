# REQ-013 — R4 lesson review and skill-based creation

2026-10-29. Owning functions: FR-05.05/05.08/04.06. Verification record; overall acceptance is tracked separately in system evidence.

- Updated `ModuleAuthoringServiceTest`: **14 passed**. Expert creation and content creation accept omitted Occupation and no grants; new documents use empty historical occupation metadata. Owner edits preserve old occupation tags and previous revision payloads without requiring scope overlap. Other Expert edits/submits/deletes, manager authoring and Expert approval remain denied.
- Other focused checks: **18 passed** (LearningContent domain3, service8, private-media safety4, architecture3). Combined relevant backend unit coverage is 32 unique checks, not a sum of overlapping reruns.
- Frontend workspace/transport suite: **12 passed**, including L&D's three named lesson regions, visible Text bodies and native video source, no combined preview expander, no Occupation control/field in new Module form/payload, and creation enabled with zero Occupation options.
- Final typecheck and production build **passed** after preserving the pre-existing intake-permission controls. Frontend 12 tests passed again. Existing bundle-size warning remains. Those controls retain their original API and are relabeled as intake-only, not new-authoring permission.
- Initial frontend failures relied on Occupation loading to disable Create and avoid early submits. Creation now explicitly waits for initial catalog readiness; tests await actual catalog state. Failures were corrected, not counted as passing runs.
- New shared `LearningLessonList` reuses Card/Heading/Badge, existing sanitized LessonBody and authorized LessonVideo, with design tokens and EN/VI numbering/type/duration/empty state.

Focused new-component lint passed. The existing Module workspace search-parameter effect warning remains unchanged; no blanket suppressions were added. `git diff --check` passed.

Async media regression (actual defect, not only environment latency): the first 10-check reproduction produced 8 pass/1 failure/1 error. A legitimate StreamingResponseBody async redispatch was treated as anonymous, reproducing the committed-response AccessDenied failure observed in the real L&D player. WorkspaceSessionFilter now revalidates the existing identity/workspace on ASYNC dispatch. Final **11 security/API tests passed**, including real-principal preservation, revoked-session401, suspended-workspace403 and no role-header elevation. Total relevant backend unit/API coverage is 43 unique checks (32 domain/service/architecture + 11 security), across focused runs. No permitAll exemption or fake authentication was introduced.
