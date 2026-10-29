# REQ-013 — main merge repair: unit evidence

Date: 2026-10-29. Scope: FR-05.05 / FR-05.08 / FR-04.06 local Module integration with main workspace identity. This does not certify the entire Version 2 product.

## Executed

- Backend: ModuleSessionSecurityTest 7, ModuleAuthoringServiceTest 13, WorkspaceAuthenticationServiceTest 11, HexagonalArchitectureTest 3: **34 passed**.
- Frontend: LoginPage, ModuleManagementWorkspace and workspaceRole suites: **22 passed** across three files. WorkspaceBoundary regression adds **1 passed**, for **23 frontend tests** total.
- TypeScript build and Vite production build: passed. Vite reports an existing large-chunk warning.
- Focused lint: zero errors; existing WorkspaceLayout set-state-in-effect warning remains.

Security assertions cover trusted account/organization/role, active workspace entitlement, rejected demo cookies and spoofed role headers, CSRF mutations, and revoked sessions. The boundary regression preserves an unsaved title across identity and entitlement revalidation. Module tests retain version/lifecycle/history rules. Frontend tests verify the existing login/MFA flow and shared CSRF transport.

Commands: `./mvnw test -Dtest=ModuleSessionSecurityTest,ModuleAuthoringServiceTest,WorkspaceAuthenticationServiceTest,HexagonalArchitectureTest`; frontend `vitest run` on the three named suites, `tsc -b`, `vite build`. Bundled Node 24 used with existing lockfile dependencies; no dependencies added.

See [integration evidence](../integration/REQ-013-main-merge-resolution.md) and [system evidence](../system/REQ-013-main-merge-resolution.md).
