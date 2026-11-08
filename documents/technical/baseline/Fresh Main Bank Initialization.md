# Fresh main initialization after version reconciliation

Confirmed user scope2026-11-01: keep main migration versions/content, use new own versions, synchronize dependencies/build, prepare Docker. The user chooses to remove the existing containers/volumes and test from scratch; retained-DB comparison/adoption is cancelled. This document does not authorize the agent to delete containers/volumes or fabricate learner results.

All active `db/migration`, `db/workspace-migration` and `db/module-migration` lineages retain main V1–V43 unchanged and add:

| Version | Own behavior |
| --- | --- |
| V44 | Create org Assessment Policy/version/activation/receipt/history and original-policy attempt/result/evidence guards. No policy is seeded or activated. |
| V45 | Permit a null department reference for an explicitly configured own baseline-resource binding; existing non-null references/FKs remain enforced. |
| V46 | Repeat only the exact guarded TechNova unconfigured Job Position-binding typo correction. No bank transfer or learner-history rewrite. |

The four colliding original local scripts are preserved byte-identically under `db/history`, outside active Flyway locations. No main SQL, applied checksum or source manifest/lock is edited. Fresh initialization uses the ordinary main Flyway table/configuration; no custom history table, baseline marker, repair or skipped migration is used. This tree is not a supported in-place upgrade for a retained revision18 database.

After the user has removed the old stack's containers and volumes, run from the product root:

```powershell
docker compose -f compose.dev.yml up --build -d
```

Keep main's migration→seed→workspace-seed→SE-seed→API ordering. The existing deterministic main bank projection creates the Security135/SE360 banks for TechNova with mapped IDs/content hashes; it does not transfer old live banks or initialize learner outcomes. Do not reuse the old API-update override that disables account/catalog bootstrap for this first initialization.

L&D must explicitly Save/Activate an org Assessment Policy and configure/Preview/Activate the Job Position baseline. Employee then completes the real baseline, checks the selected Role/Level gap and explicitly submits the pathway request. The normal worker produces the proposal; only the actual responsible Expert may review/confirm. No direct SQL completion, fake readiness, copied proposal or automatic approval is part of verification.

Compile/build, image creation and migration-file inventory checks are not proof of successful fresh boot/full journey. Record actual startup/manual results separately; executable C3 remains separately scoped. The previously observed generated pathway belongs to the old stack and must not be presented as evidence for this new initialization. The new-authored Role/Job Position consumer integration remains a separate known limitation from migration reconciliation.
