# Question Bank / Learning Module source reconciliation

2026-11-01. Scope: backend, authorization and router/UI conflicts following [migration reconciliation](MIGRATION_LINEAGES.md). No new database fields or business policies were introduced. The later user-authorized8088 deployment is recorded below; no commit or push was performed.

| Conflict group | Resolution |
| --- | --- |
| TargetRole / Competency domain, DTOs, persistence and UI | Preserve the current branch's code, levelCompetencies and competencyIds mappings, version/diff UI, stable string role IDs and authenticated organization context. Incoming older definitions must not remove these fields. |
| Legacy module write API | Preserve catalog reads; obsolete direct save/delete return HTTP410 through the existing exception handler. Authoring goes through version, ownership and review checks in module-management. |
| Module/content/review pages | Use the existing ModuleManagementWorkspace from Learning Module, including server-backed content, separate lessons, revision/history and owner-only commands. Remove the obsolete unreferenced learningContentStore localStorage implementation. |
| Shared authentication | Preserve the current real workspace sign-in, trusted organization and single-role boundaries; no new demo login/persona selector is introduced. Keep workspaceFetch CSRF and spoofed-header stripping, including the incoming concurrent-token request handling. |
| L&D routing | Keep exactly one /ld-manager/modules route to the manager workspace. The /manager/modules compatibility route redirects there. Keep L&D Question Bank navigation and current responsive sidebar behavior. |
| Pathway / reader | Preserve current generation/review algorithms and real-session access. Merge requireCurrentEntry for learner content admission. Retain the existing lesson-reader frame. Manual assignment endpoints remain retired and no manual assignment page is routed. |
| Question Bank | Preserve automatic server codes, creation-only import templates, ownership, immutable published definitions and review/error feedback. These files are not replaced with earlier module-era prototypes. |

Existing development-only personas and unrelated prototype stores remain outside this bounded source reconciliation; they are not an authorization source for these protected module or Question Bank routes. The independent-skill prototype view is not recertified as a generated pathway.

Durable domain-document conflicts have now been reconciled: current consolidated feature documents remain active; moved technical records are retained, and byte-identical duplicate history copies are removed. New fields, Neo4j relationships and business rules are not introduced here; architecture/schema conflicts are not resolved by copying UI mock attributes.

Verification and manual checks: [unit/component](../testing/unit/REQ-013-014-merge-resolution.md), [integration](../testing/integration/REQ-013-014-merge-resolution.md), [system/manual](../testing/system/REQ-013-014-merge-resolution.md).

Verification boundary: backend/frontend builds,76 selected backend cases,25 distinct frontend cases and2 browser UI-contract journeys passed. The first real-store attempt was partial. The sequential retest passed all10 real-store cases; the historical failures remain in evidence. Existing8088 read/navigation smoke loaded six staff routes with295 actual Modules, but full merged browser mutation acceptance remains incomplete. The local bootstrap side effect was reversed after explicit user approval. API8088 restarted with seeds disabled;18 table hashes,270 foreign-key relationships and48 Role maps passed post-restart verification. Full browser mutation acceptance remains incomplete.

## Document reconciliation and operational protection

Preserved Question Bank automatic-code/new-only-import contracts and v0.11 Competency/module schema; retained Module/content/history/real-pathway behavior from the incoming branch. Original feature-file deletions are moves into technical records, not removal of the current feature contract. Three duplicate incoming-pathway history files were byte-identical to their retained canonical technical records. The active Learning Catalog/Assessment/Employee implementation summaries now distinguish real content from separate exam/mastery work. Moved links are repaired within this slice; old graph test results remain dated evidence and were not rerun as part of documentation checks.

Accounts Compose explicitly disables main's development bootstrap after the accidental first startup. This changes no product schema or main development defaults. See the [system recovery gate](../testing/system/REQ-013-014-merge-resolution.md#authorized-seed-recovery-and-restart--2026-11-01) before using8088.

Final recovery smoke:7/7 real8088 loaded routes passed for Expert/L&D/Employee; directory295 Modules, Employee actual empty pathway and staff-bank403 verified. This closes the scoped recovery/readiness gate, not the separate full mutation/mobile browser suite. [Current receipt/manual checklist](../testing/system/REQ-013-014-merge-resolution.md#authorized-seed-recovery-and-restart--2026-11-01).
