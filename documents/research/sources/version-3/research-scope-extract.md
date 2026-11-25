# Version 3 research scope extracts

Source: user-supplied FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_3.docx. Read on 23 November 2026. SHA-256: `8233092418645e967422a4020218a03a7b9a2585bb9b64b830eb102e28c5d30f`. Exact selected paragraphs only; not the complete registration or approval of all runtime changes. Personal registration details omitted.

Manage role competency requirements: The Expert shall define required micro-skills and knowledge levels for each Level of an assigned target Role. 

Manage skill prerequisites: The Expert shall manage prerequisite relationships with explicit knowledge levels for both skills. The system shall reject circular dependencies. 

Manage learning modules: The Expert shall manage learning modules and their versioned content, mapping each module to one or more micro-skills with explicit knowledge levels and learning outcomes. 

Complete baseline assessment: The Employee shall select a Role and Level, complete the corresponding Baseline assessment, resume unfinished answers within the original deadline, and view results and history. Baseline results shall provide diagnostic information without granting official achievement. 

Generate and adapt learning pathways: The System shall generate Expert-approved pathways with module or certificate alternatives for unmet requirements, without adding unassessed prerequisites. Later assessments may add supplementary learning requiring its own official completion. Updates shall preserve progress, history, and access to started content. 

-Internal Learning Content: Representative learning modules with embedded learning content and assessment questions for at least two isolated demo organizations.

-Evaluation Benchmark: Versioned datasets, experiment scripts, raw results, and analysis for RQ1 recommendation relevance, RQ2 graph query latency, and RQ3 simulated pathway adaptation.

-RQ1: How does the Recommendation Relevance (Hit Rate@5) of the Graph-Traversal algorithm compare to a baseline Content-Based Filtering approach for matching learning modules to skill gaps?

-Experiment 1 (RQ1 - Accuracy): Create a synthetic dataset of 500 users with varying skill gaps. Ask subject matter experts to annotate the "correct" top 5 learning modules for 50 sample profiles. Compare the Graph Algorithm output vs Baseline output against this golden set.

Content & Demo Constraints: Creating actual educational content (recording videos, building SCORM packages, writing detailed course syllabi) is strictly out of scope. The evaluation will be conducted using a curated, synthetic dataset of skills and dummy learning modules to mathematically prove the algorithmic correctness and latency of the Knowledge Graph traversal. The system is a proof-of-concept for the recommendation engine, not a fully featured Learning Management System (LMS) intended to immediately replace commercial platforms.
