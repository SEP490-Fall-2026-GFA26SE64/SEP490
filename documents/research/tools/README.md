# Research tools

Run every command from the repository root.

| Tool | Purpose | Command |
|---|---|---|
| `build_application_developer_catalog.py` | Builds the RQ1 catalog `data/rq1/application-developer-v0.1/` | `python3 documents/research/tools/build_application_developer_catalog.py` |
| `validate_application_developer_catalog.py` | Structural checks for that catalog | `python3 documents/research/tools/validate_application_developer_catalog.py` |
| `build_rq1_profiles.py` / `validate_rq1_profiles.py` | Builds and checks the 500 synthetic profiles in `data/rq1/profiles-v0.1/` (seed 20261123) | `python3 documents/research/tools/build_rq1_profiles.py` |
| `run_rq1_shortlist_agreement.mjs` | Reruns RQ1 G0/C0 top-5 vs the consensus shortlist from the two Excel files, using the benchmark page's engine. Writes `results/rq1/<run-id>/` | `node documents/research/tools/run_rq1_shortlist_agreement.mjs [runId]` |
| `serve_rq1_browser_review.mjs` | Isolated RQ1 page on `127.0.0.1:4180/rq1-review.html` for Playwright | `node documents/research/tools/serve_rq1_browser_review.mjs` |
| `rq2-seed.cypher` | Synthetic MicroSkill prerequisite graph (`$nodes` = 1000/5000/10000, 1.8 edges per node) | Used by the two scripts below |
| `run-rq2-standalone.sh` + `Rq2Standalone.java` | One RQ2 scale on an isolated Neo4j container (`compose.rq2-standalone.yml`): seed, 50 warm-ups, 100 measured queries, JSON result | `RQ2_NEO4J_PASSWORD=<local> bash documents/research/tools/run-rq2-standalone.sh <1k\|5k\|10k> <out.json>` |
| `summarize_rq2_runs.py` | Summarizes repeated RQ2 runs in one run directory (median and min–max of P50/P95/mean per scale); writes `summary.json` | `python3 documents/research/tools/summarize_rq2_runs.py documents/research/results/rq2/<run-id> [--exclude file.json]` |
| `seed-rq2.sh` | Seeds the three RQ2 graphs for the in-app page (`compose.dev.yml` + `compose.rq2-dev.yml`) | `bash documents/research/tools/seed-rq2.sh` |
| `build_rq3_pilot_cohort.py` | Builds the 100-profile RQ3 cohort `data/rq3/pilot-v0.1/` from development profiles | `python3 documents/research/tools/build_rq3_pilot_cohort.py documents/research/data/rq1/profiles-v0.1/development450.jsonl documents/research/data/rq3/pilot-v0.1` |
| `Rq3SimulationRunner` (backend) | Runs RQ3 and writes `results/rq3/<run-id>/` | See [RQ3 evidence](../evidence/rq3/20261125/README.md) |
| `serve_rq3_browser_review.mjs` | Isolated RQ3 page on `127.0.0.1:4183/rq3-review.html` for Playwright | `node documents/research/tools/serve_rq3_browser_review.mjs` |
| `build_research_doc.py` | Builds the framework Word file from `RESEARCH_FRAMEWORK.md` (needs `python-docx`) | `python3 documents/research/tools/build_research_doc.py` |

`RESEARCH_MANUSCRIPT.docx` is built from the Markdown with pandoc:

```bash
cd documents/research && pandoc RESEARCH_MANUSCRIPT.md -o RESEARCH_MANUSCRIPT.docx
```

Both `.docx` files are git-ignored.
