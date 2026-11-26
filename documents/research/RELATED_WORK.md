# Related work and evidence map

Updated 22 November 2026. This is a focused initial literature review for the research design, not a systematic review or an exhaustive novelty claim. The study evaluates an existing rule-and-evidence-based system in an Application Developer setting. It does not introduce a trained knowledge-tracing model or claim that knowledge graphs are new to educational recommendation.

## Search and inclusion process

Initial searches covered: `knowledge graph learning path recommendation prerequisite`, `path-based educational recommendation generalization`, `knowledge tracing procedural knowledge`, `sampled recommendation metrics`, and `rigorous benchmarking`. Searches also targeted Design Science Research methodology. Sources were checked on 22 November 2026.

Include original research with a traceable author/publisher record and a direct connection to the method, evaluation or limitations. Treat preprints as preprints. Use official library/database documentation for implementation semantics, not evidence of educational effectiveness. Exclude marketing claims and unsupported comparisons between Neo4j and relational databases. No numerical advantage from another paper is transferred to this project.

The review below distinguishes abstract-level screening from inspected full-text sections. Before submission, extend citation chaining, record screening decisions and compare additional recent work. A publication-ready novelty claim requires that broader review.

## Evidence matrix

| ID | Source and inspection depth | What the source establishes | Consequence for this study |
|---|---|---|---|
| R1 | Peffers et al., 2007; original paper PDF, methodology passages | A design-science process connects problem identification, objectives, artifact construction, demonstration, evaluation and communication | Use it to organize artifact evaluation; it does not itself validate this platform |
| R2 | Frej et al., LAK 2024; author preprint full-text methodology and study sections | Educational KG path recommendation has been evaluated with educational datasets and a learner-oriented study | KG-based educational recommendation is established prior work; our synthetic evaluation must not be described as a user study |
| R3 | Afreen et al., UMAP 2025; publisher search extract and coauthor overview, full paper access incomplete | Transfer of path-reasoning recommenders into education requires evaluation across utility, beyond-utility and explanation dimensions | A relevance improvement is narrower than general educational superiority; complete full-text extraction before detailed methodological comparison |
| R4 | Cheng et al., 2025, KnowLP preprint v2; method overview and section 5.8 | Combines prerequisite and similarity structures with a learned recommendation method; includes simulator-based evaluation | Our deterministic evidence rules differ from this learned approach; simulation assumptions must be disclosed rather than equated with real learning outcomes |
| R5 | Corbett and Anderson, 1994; publisher abstract and bibliographic record | Knowledge tracing estimates changing knowledge probabilities while learners practice programming skills | Do not label the current rule engine Bayesian Knowledge Tracing; preserve registered RQ3 text and disclose the implementation boundary |
| R6 | Krichene and Rendle, KDD 2020; author research page and original extended abstract | Sampled ranking metrics can change relative comparisons between recommenders | Keep the ranking catalog common; decide judgment coverage before final evaluation and never treat unjudged items as irrelevant |
| R7 | Kalibera and Jones, ISMM 2013; author publication record and abstract | Performance evaluation must account for variation and repeated experimental levels | Record environment, repeat measured blocks and report variability; identical seeds do not guarantee identical timings |

## Defensible research positioning

The proposed contribution is a bounded system evaluation: explicit Role–Level requirements, version-compatible module mappings, a distinction between diagnostic and official evidence, and evidence-triggered pathway revisions are evaluated together in one workforce-development case. Three experiments assess recommendation relevance, directed prerequisite-query cost, and simulated adaptation at equal activity budgets.

This is a proposed contribution, not a claim that no earlier work combines graphs and adaptation. The specific question is whether this implementation is useful under the stated catalog, evidence rules, data and simulator assumptions. The primary RQ1 contrast measures structured mapping versus text matching; it cannot isolate the benefit of prerequisite topology at an initial snapshot that does not expand unassessed prerequisites. RQ2 is a graph-query microbenchmark, not an end-to-end throughput or Neo4j-versus-SQL comparison.

## Bibliography

**R1.** Ken Peffers, Tuure Tuunanen, Marcus A. Rothenberger, and Samir Chatterjee. 2007. *A Design Science Research Methodology for Information Systems Research*. Journal of Management Information Systems 24(3), 45–77. [DOI](https://doi.org/10.2753/MIS0742-1222240302). [Original paper PDF](https://zhang.ist.psu.edu/teaching/504/readings/Peffers.pdf). Publisher citation year is 2007; the issue is Winter 2007–08.

**R2.** Jibril Frej, Neel Shah, Marta Knežević, Tanya Nazaretsky, and Tanja Käser. 2024. *Finding Paths for Explainable MOOC Recommendation: A Learner Perspective*. LAK '24. [DOI](https://doi.org/10.1145/3636555.3636898). [Author preprint, submitted 2023](https://arxiv.org/abs/2312.10082). [Full text](https://arxiv.org/html/2312.10082v1).

**R3.** Neda Afreen, Giacomo Balloccu, Ludovico Boratto, Gianni Fenu, Francesca Maridina Malloci, Mirko Marras, and Andrea Giovanni Martis. 2025. *Can Path-Based Explainable Recommendation Methods based on Knowledge Graphs Generalize for Personalized Education?* In Proceedings of the 33rd ACM Conference on User Modeling, Adaptation and Personalization (UMAP '25), 273–278. ACM, New York, NY, USA. [DOI](https://doi.org/10.1145/3699682.3728323). [Coauthor overview](https://www.ludovicoboratto.com/can-path-based-explainable-recommendation-methods-based-on-knowledge-graphs-generalize-for-personalized-education/). Author order and pages verified against the Crossref record on 25 November 2026; detailed experimental extraction from the full text is still pending.

**R4.** Xinghe Cheng, Zihan Zhang, Jiapu Wang, Liangda Fang, Chaobo He, Quanlong Guan, Shirui Pan, and Weiqi Luo. 2025. *GraphRAG-Induced Dual Knowledge Structure Graphs for Personalized Learning Path Recommendation*. arXiv preprint 2506.22303, v2. [Record](https://arxiv.org/abs/2506.22303). [Full text](https://arxiv.org/html/2506.22303v2). No peer-reviewed venue is inferred from this record.

**R5.** Albert T. Corbett and John R. Anderson. 1994. *Knowledge tracing: Modeling the acquisition of procedural knowledge*. User Modeling and User-Adapted Interaction 4, 253–278. [Publisher record](https://doi.org/10.1007/BF01099821).

**R6.** Walid Krichene and Steffen Rendle. 2020. *On Sampled Metrics for Item Recommendation*. In Proceedings of KDD '20, 1748–1757. [DOI](https://doi.org/10.1145/3394486.3403226). [Author research record](https://research.google/pubs/on-sampled-metrics-for-item-recommendation/). [Authors' 2021 extended abstract](https://www.ijcai.org/proceedings/2021/0651.pdf).

**R7.** Tomas Kalibera and Richard Jones. 2013. *Rigorous Benchmarking in Reasonable Time*. ISMM '13, 63–74. [DOI](https://doi.org/10.1145/2464157.2464160). [Author publication record](https://www.cs.kent.ac.uk/people/staff/rej/pubs.html).

**T1.** Neo4j. *Cypher 5 Manual: shortest-path functions*. [Documentation](https://neo4j.com/docs/cypher-manual/5/patterns/reference/shortest-paths/). Pin the exact installed database version and record query plans; a function's lower path bound should be 0 or 1.

**T2.** scikit-learn. *TfidfVectorizer*. [Documentation](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html). Pin the experimental dependency version rather than relying on a moving `stable` URL.

**T3.** scikit-learn. *ndcg_score*. [Documentation](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html). The protocol must fix gain and tie conventions; library output is checked against hand-calculated cases.
