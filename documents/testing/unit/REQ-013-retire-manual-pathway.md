# REQ-013 — retire manual test assignment (2026-10-30)

Scope: remove Expert/Employee manual test entry points, keep initial pathway guidance and existing lesson reader.

Passed: 14/14 Vitest tests across InitialEmployeePathway, LearningModuleReaderPage and ModuleManagementWorkspace. The new empty-state test asserts role CTA and zero manual assignment requests. First concurrent run: 10 passed/3 timed out; sequential rerun: all 14 passed. No timeout thresholds were changed.

Passed: ManualPathwayRetirementTest and GeneratedModuleContentAccessTest (2/2): GET/POST handlers return 410 without invoking assignment service; generated content requires matching version/available lessons and rejects unsupported gates.

Passed: TypeScript project build, Vite build and targeted lint (one pre-existing set-state-in-effect warning in workspace; no errors).

Commands: Vitest run with --maxWorkers=1 --no-file-parallelism and the three named files; TypeScript tsc -b frontend; Vite build; Maven -Dtest=ManualPathwayRetirementTest,LearningContentIntegrationTest,GeneratedModuleContentAccessTest test. Logs: /tmp/sep490-remove-manual-{frontend-rerun,backend,build,lint}.log.

Historical manual selector/assignment unit fixtures remain isolated legacy coverage, not evidence that a current route/API offers manual assignment. No claim of a full repository suite run.
