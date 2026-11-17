# RIASEC test/demo runtime

RIASEC is opt-in (`RIASEC_ENABLED=true`) in the existing `local,workspace-baseline` application composition, excluding `local-baseline-demo` and `prod`. It uses real server-side Employee and organization identity. There is no manager route to personal results. This composition is for low-volume demonstrations, not production.

PostgreSQL V72 creates only `platform.riasec_workspace` and `platform.riasec_result`. Job Position profiles remain exclusively in Neo4j. Apply migration through the environment's normal Flyway procedure after checking history; never replay retired V66–V71 or run a full seed to enable RIASEC. Local preflight found V65 current and only V72 pending, with old checksums valid. The former machine-specific runtime override is not part of the dev source configuration.

The RIASEC model and private inference network are defined directly in `compose.dev.yml`. No local prebuilt-image or test Compose overlays are required. Deployment Compose files are unchanged.

Selected model: `qwen3:4b-instruct-2507-q4_K_M` (Q4_K_M; approximately 2.5 GB weights). Default Ollama allocation: **2 CPU, 5 GiB RAM**, context 8192. These are per-container demo limits, not member-server specifications. Reserve additional resources for API/web/databases. Member CPU/RAM and latency remain unmeasured. `RIASEC_OLLAMA_MEMORY` and `RIASEC_OLLAMA_CPUS` adjust the container limits. Model changes need matching setup/API configuration and quality verification.

Development setup (run only when intentionally preparing the dev environment):

```powershell
docker compose -f compose.dev.yml --profile riasec-setup run --rm --no-deps riasec-model-pull
docker compose -f compose.dev.yml build api web
docker compose -f compose.dev.yml up -d --no-deps api web riasec-ollama
```

These commands do not authorize replaying seeds or migrations against an existing database. Confirm schema history first. The normal dev source Dockerfiles are used; machine-specific prebuilt-image Dockerfiles were removed. Existing running containers/volumes are not stopped by this source cleanup.

Worker poll: 2 seconds. Queue deadline: 20 minutes. Claimed job deadline: 8 minutes. HTTP timeout: 7 minutes. Independent maintenance every 15 seconds marks overdue work failed and permanently removes submissions deleted at least 7 days ago. Drafts never expire. An interrupted processing job becomes failed after its deadline, with an explicit retry on the latest active result. A successful zero-result response is final. The API must run for maintenance; after downtime, overdue work is processed when it starts again.

AI input contains only six Employee scores and current active, valid Job Positions in the same organization. No fixed matching formula, Role, Skill or learner history is used. AI selects IDs, ranks, exactly two relevant dimension letters and an English explanation of the interest profiles only. Job duties/technologies are not inferred in the explanation. The server validates identifiers and copies original Employee/position scores for those dimensions; AI never supplies displayed numeric evidence. Each explanation is bounded to80–350 characters directly in a letter/punctuation JSON grammar; inference uses two threads and at most1200 output tokens. These checks cannot prove every sentence; manual quality review remains necessary. Inputs above the conservative12000-character catalog bound fail instead of silently dropping positions. Retry uses current catalog data; successful recommendations preserve immutable position snapshots. The six interest properties are excluded from learning-catalog fingerprints, so profile edits do not invalidate Role requirement snapshots.

Both seed profiles and the eight identified local profiles are newly chosen **test/demo fixtures**, not official or O*NET-validated occupational profiles. The original 60 EN/VI activities remain; Vietnamese adaptation validation is unresolved. Scores are raw integer sums 0–40, not percentages or competence measures.

Focused verification uses disposable PostgreSQL through Testcontainers and frontend mocks:

```powershell
# Java 21, from backend
./mvnw.cmd -o -Priasec test
# From frontend
node node_modules/vitest/vitest.mjs run src/features/employee/riasec/RiasecExperience.test.tsx --environment jsdom
```

No command here resets databases, seeds shared catalogs or publishes a server deployment.

References: [O*NET scoring manual](https://www.onetcenter.org/dl_files/IP_Manual.pdf), [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs), [selected model](https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M).
