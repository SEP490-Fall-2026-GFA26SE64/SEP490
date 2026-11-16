# REQ-060/061: Guided starter catalog browser verification

Date: 2026-11-12. FR-01.01 / FR-07.03 local scope. Historical onboarding evidence is unchanged.

## Environment and command

- Isolated Compose project: `alg-starter-r3`, independent named volumes.
- Actual URL: `http://127.0.0.1:8096/guest/register`; API 18096, PostgreSQL 15447, Neo4j HTTP/Bolt 7484/7694.
- Docker server 28.1.1, Java 21.0.6, Node 22.15.0, installed Chrome.
- Base Compose files: `compose.dev.yml` and `compose.multi-org-test.yml`. Session-only override gave API/seed images the dedicated `alg-starter-r3-backend:dev` tag, web its own tag, and used cached `minio/minio:latest` after the pinned MinIO pull failed.
- Email verification, MFA and payOS disabled only in this isolated development environment. No live payments, real emails or production acceptance.
- Final browser run served the actual `npm.cmd run build` output using a session-only Node static server on 8096, proxying `/api` to 18096. This avoided a Vite startup/navigation timeout observed while real-database tests competed for resources. It did not mock the API or data stores.
- After verification, the static helper and this isolated Compose project were stopped. Test volumes/data were retained; no shared project was stopped or reset by this task. The recorded URL is the tested address, not a promise of an always-running preview.

From `frontend`, with the isolated fixture password supplied through the environment:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8096'
npm.cmd run test:system:f02 -- REQ-060-starter-catalog.spec.ts --output=test-results\starter-catalog-r3-verified
```

`WORKSPACE_DEVELOPMENT_PASSWORD` must match the isolated seed. Do not copy real credentials into source or this document. The test deliberately refuses other base URLs and reads only the named isolated database containers.

## Final result

**5 passed, 0 failed/skipped, exit 0; 42.3 seconds.**

| Journey | Observable assertions |
| --- | --- |
| Guided catalog, 1440px | Five allowed types; job-to-role navigation; add/prune branch; retained role does not restore excluded competency; prerequisite lock; real graph pixels; Apply/Cancel; saved selection; dev purchase; READY; reload; exact actual copied node/edge sets equal preview |
| Same journey, 390px | Mobile Browse/Graph/Your catalog panels; same actual persistence/import checks |
| Empty/invalid/security | Missing CSRF returns 403; excluded module root returns 400 field error; empty registration/provisioning creates no Neo4j catalog nodes |
| Browser-only failure fixtures, 375px | Catalog failure/retry, pending preview disables Apply, preview failure/retry, no horizontal dialog overflow, Escape restores trigger focus, Vietnamese and dark/reduced-motion rendering |
| Populated Expert graph | Real Expert session; wait for nonempty API-backed palette, load sample, assert positive node count and visible canvas; no uncaught/console/network errors |

The failure/loading test explicitly intercepts two HTTP responses; those assertions are **UI-fixture evidence**, not backend outage/recovery evidence. The other journeys use actual APIs and stores.

Happy-path and Expert observers assert no uncaught page errors, unexpected console errors, unexpected server 5xx or non-aborted failed requests. Initial anonymous registration/workspace-current 401 responses are expected. Guest catalog interaction makes no organization authoring writes.

## Measured output and screenshots

Final artifacts: [browser output](../../../frontend/test-results/starter-catalog-r3-verified/).

- Desktop: `REQ-060-starter-catalog-gu-b0a7d-exactly-the-preview-1440px--system-chrome/catalog-graph-1440.png`, `catalog-selection-1440.png`, `workspace-ready-1440.png`.
- Mobile: `REQ-060-starter-catalog-gu-56b18--exactly-the-preview-390px--system-chrome/catalog-graph-390.png`, `catalog-selection-390.png`, `workspace-ready-390.png`.
- Small/mobile states: `REQ-060-starter-catalog-br-def12-and-keyboard-close-at-375px-system-chrome/catalog-mobile-375.png`, `catalog-mobile-vi-dark.png`.
- Expert: `REQ-060-starter-catalog-Ex-e8c9b-nce-without-Guest-mutations-system-chrome/expert-graph-shared-appearance.png`.

Screenshots were inspected. A canvas-visibility assertion initially missed a **blank mobile graph** caused by initialization in a hidden panel. ResizeObserver now redraws/fits after the panel becomes visible, and tests inspect drawn skill-color pixels, not just canvas existence. Expert verification was strengthened to wait for actual nonempty data rather than accepting an empty initial canvas.

Earlier failed runs remain separately under `starter-catalog-r3`, `starter-catalog-r3-run2`, `starter-catalog-r3-final`; passing intermediate runs are separate. Initial failures included test label/Quick Sample selectors, empty initial Expert data and a 5-second navigation timeout under simultaneous build/database load. These are not added to the final pass count.

## Manual checklist

Prerequisites: approved isolated stack or equivalent fresh local/dev setup, platform template available, browser, test registration email, optional dev-only integration bypasses configured by the operator.

1. Open the registration URL. Choose catalog: form remains compact; dialog fills most of the viewport.
2. Explore Job position -> Target role -> Level -> Competency/Skill. Search by code/name; change filters and clear them. Chosen items must remain unchanged.
3. Add a role/branch; remove a competency or skill. The retained parent must not restore the removed subtree.
4. Inspect a prerequisite's lock/reason. Remove its dependents: automatic dependencies should disappear only when unused. Independently chosen items remain chosen.
5. Try Show more and an oversized branch. Results beyond 60 remain reachable; exceeding 300 explicit choices displays an error without adding a partial branch.
6. Cancel and reopen: applied choices are preserved. Apply and reopen: the new choices persist within this registration form. Closing before account creation does not promise persistence across browser reload.
7. Check 1440px, 390px and 375px; mobile graph must draw actual nodes after tab switching. Exercise keyboard focus, zoom/fit, EN/VI and dark/reduced motion.
8. Complete account creation, reload the saved registration, select a plan and use only the configured dev bypass. Enter only after READY. Inspect copied node/edge ids/counts and requirement metadata; no module/certificate content is imported.
9. In a separate Expert session open Ontology -> Explore Graph, wait for data and load a sample. Shared node visualization must render without exposing those authoring controls to Guests.

## Boundaries

The [45 scoped backend and 24 frontend checks](../unit/REQ-060-061-starter-catalog-20261112.md) passed. Standard Maven test compilation and two whole-repository architecture rules retain unrelated pre-existing failures; **the full repository test pipeline is not green**. No compatibility migration for old unfinished selections, no changes to already-copied workspaces and no general Expert-authoring or production certification.
