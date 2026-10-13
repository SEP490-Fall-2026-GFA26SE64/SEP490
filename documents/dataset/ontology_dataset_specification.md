# Role-centred ontology dataset and source evidence

Catalog version 0.3.1. Rubric version 1.1. Updated 12 October 2026.

## Authoritative release and scope

The supplied `ontology_v03_high_priority_fixed.xlsx` is the content baseline. This release retains its role, skill, course, module and relationship IDs, level-specific requirement tasks, rubric 1.1, score thresholds and mandatory flags. It makes approval metadata consistent, adds 20 learning prerequisite edges and supplies local learning content. The earlier generated v0.3 workbook and JSON are historical; do not combine them with this release.

One organization, four roles, three levels per role. AI focuses on ML rather than GenAI/LLMs; Full-stack is framework-neutral; Software Tester includes manual, automated and bounded performance tasks.

| Dataset component | Count |
|---|---|
| TargetRoles | 4 |
| Levels | 12 |
| Competencies | 36 |
| MicroSkills | 64 |
| Courses | 36 |
| LearningModules | 72 |
| HAS_LEVEL | 12 |
| REQUIRES_COMPETENCY | 36 |
| REQUIRES_SKILL | 201 |
| HAS_COURSE | 36 |
| HAS_MODULE | 72 |
| TEACHES | 201 |
| HAS_PREREQUISITE | 20 |
| Total graph nodes | 224 |
| Total graph relationships | 578 |
| Rubric criteria (configuration, not graph nodes) | 4 |
| Officially publishable records | 0 |


All 224 nodes and 578 relationships retain lifecycle ACTIVE and now have reviewStatus=NEEDS_EXPERT_REVIEW with null approval identities/timestamps. Rubric 1.1 is DRAFT and NEEDS_EXPERT_REVIEW. The original file contains APPROVED labels without reviewer evidence; these are not treated as verified approvals. The package change log records each previous label.

There are 64 unique skills: 20 reused ESCO concepts and 44 locally derived outcomes. Thirty-six courses and 72 modules now exist. They are locally authored lessons, practice collections and evidence tasks, not courses published or endorsed by ESCO/SFIA. The cited vocabularies, capability frameworks and technical references support the underlying skill content; they do not approve course design or numeric thresholds.

## Framework basis and limits

| Reference | What is used | What is not inferred |
|---|---|---|
| [ESCO][F-ESCO] and [occupations pillar][F-ESCO-O] | Occupational anchors, skill labels and concept identity | No universal Junior/Middle/Senior scores |
| [Extending ESCO][F-EXT] | Basis for local extensions with traceable mappings | Derived outcomes are not new official ESCO concepts |
| [SKOS][F-SKOS] | Vocabulary labels and mappings | This graph is not declared a complete SKOS/RDF implementation; broader is not prerequisite |
| [SFIA][F-SFIA] | Reference for responsibility and increasing autonomy | No numeric conversion or exact level equivalence |
| GOV.UK role profiles | Work scope and proficiency descriptions | UK ML profiles start at senior/lead; local Junior/Middle are synthesized |
| O*NET occupations | Occupational tasks | A job task is not automatically a granular skill or assessment cut-off |
| Official technical documentation and ISTQB | Basis for observable technical actions | Tool examples do not make a particular vendor mandatory |


## Schema, publication and assessment

See [Ontology fields, publication and assessment rules](ontology_fields_review.md) for the complete field dictionary, publication gate, rubric 1.1 and conditions for attainment. The [current English seed](ontology_v031_en.json) contains business records and rubric configuration without source-provenance fields.

Official use requires approved records and their complete required dependencies. Do not ignore pending requirements by filtering them out before aggregation. This entire seed remains a preview catalog pending genuine review; no official decisions are authorized by its ACTIVE labels.

All 201 REQUIRES_SKILL rows remain mandatory. Junior tasks are bounded and guided; the same skill labels across levels do not imply identical performance. The mandatory inventory is a prototype policy, not a general occupational minimum. Junior DE13, AI11, AI16 and QA15 are specifically highlighted for scope calibration in the field document.

## TargetRoles

| id | code | name | scope |
|---|---|---|---|
| ROLE-DE | DE | Data Engineer | Data pipelines, warehouse modelling, data quality and operations. |
| ROLE-AI | AI | AI Engineer | Building, evaluating and deploying ML models; GenAI and LLM specialisation are excluded. |
| ROLE-FS | FS | Full-stack Developer | Web interfaces, application services, data and integration without a prescribed framework. |
| ROLE-QA | QA | Software Tester | Manual and automated functional testing, integration testing and basic performance testing. |

## Levels

| id | targetRoleId | name | context |
|---|---|---|---|
| LV-DE-J | ROLE-DE | Junior | Complete bounded tasks with guidance and review. |
| LV-DE-M | ROLE-DE | Middle | Deliver and troubleshoot routine production work independently. |
| LV-DE-S | ROLE-DE | Senior | Resolve complex cross-component problems, justify trade-offs and review the work of others. |
| LV-AI-J | ROLE-AI | Junior | Complete bounded tasks with guidance and review. |
| LV-AI-M | ROLE-AI | Middle | Deliver and troubleshoot routine production work independently. |
| LV-AI-S | ROLE-AI | Senior | Resolve complex cross-component problems, justify trade-offs and review the work of others. |
| LV-FS-J | ROLE-FS | Junior | Complete bounded tasks with guidance and review. |
| LV-FS-M | ROLE-FS | Middle | Deliver and troubleshoot routine production work independently. |
| LV-FS-S | ROLE-FS | Senior | Resolve complex cross-component problems, justify trade-offs and review the work of others. |
| LV-QA-J | ROLE-QA | Junior | Complete bounded tasks with guidance and review. |
| LV-QA-M | ROLE-QA | Middle | Deliver and troubleshoot routine production work independently. |
| LV-QA-S | ROLE-QA | Senior | Resolve complex cross-component problems, justify trade-offs and review the work of others. |

## Competencies

| id | levelId | name | outcomeStatement | acceptanceCriteria |
|---|---|---|---|---|
| C-DE-J-MODEL | LV-DE-J | Data modelling and storage | Build a small data model and warehouse structure from supplied requirements. | Model constraints match sample data; document metadata and affected consumers. |
| C-DE-J-PIPE | LV-DE-J | Data pipeline implementation and integration | Implement a small data flow from an existing design. | Run extraction and transformations; verify mappings and safe task retries. |
| C-DE-J-QUAL | LV-DE-J | Data quality and operations | Check data quality and record operational issues under guidance. | Provide profiling results, pipeline tests, handling controls and execution logs. |
| C-DE-M-MODEL | LV-DE-M | Data modelling and storage | Design a data model supporting several consumers. | Explain modelling choices and demonstrate workload and dependency checks. |
| C-DE-M-PIPE | LV-DE-M | Data pipeline implementation and integration | Independently implement an integrated data pipeline. | Demonstrate correct outputs and recovery from expected task failures. |
| C-DE-M-QUAL | LV-DE-M | Data quality and operations | Investigate data failures across a pipeline. | Trace causes, verify fixes and demonstrate appropriate data access controls. |
| C-DE-S-MODEL | LV-DE-S | Data modelling and storage | Review data designs across domains and recommend improvements. | Compare alternative designs and substantiate performance and change-impact decisions. |
| C-DE-S-PIPE | LV-DE-S | Data pipeline implementation and integration | Design a complex pipeline and justify its operational approach. | Compare integration alternatives and demonstrate a scalable, retry-safe design. |
| C-DE-S-QUAL | LV-DE-S | Data quality and operations | Define quality controls and monitoring for a data solution. | Evaluate control effectiveness and justify testing and incident-response improvements. |
| C-AI-J-DATA | LV-AI-J | ML data preparation | Prepare modelling data using an established procedure. | Document split and preprocessing decisions; inspect class balance and exclude leakage. |
| C-AI-J-MODEL | LV-AI-J | Model development and evaluation | Train and evaluate a baseline for a defined ML task. | Provide validation results, bounded parameter experiments and an error summary. |
| C-AI-J-OPS | LV-AI-J | Model deployment and operations | Package a model and run a guided integration trial. | Reload the artifact, reproduce the environment and demonstrate contract checks. |
| C-AI-M-DATA | LV-AI-M | ML data preparation | Design preprocessing and feature preparation for a modelling task. | Reproduce transformations and justify split and imbalance evaluation choices. |
| C-AI-M-MODEL | LV-AI-M | Model development and evaluation | Compare models and select one against the problem objective. | Use a consistent validation protocol and justify tuning and error trade-offs. |
| C-AI-M-OPS | LV-AI-M | Model deployment and operations | Integrate a model and maintain its operational workflow. | Provide monitoring evidence, reproducible runs and a tested maintenance procedure. |
| C-AI-S-DATA | LV-AI-S | ML data preparation | Review the data preparation approach for an ML solution. | Identify leakage or sampling risks and verify the chosen mitigations. |
| C-AI-S-MODEL | LV-AI-S | Model development and evaluation | Design model evaluation to support an adoption decision. | Assess alternatives, failure patterns and limitations before recommending a model. |
| C-AI-S-OPS | LV-AI-S | Model deployment and operations | Design model operations and response to performance deterioration. | Justify integration and maintenance choices and verify changes before release. |
| C-FS-J-UI | LV-FS-J | Web interface development | Build a web interface from supplied requirements. | Demonstrate semantic layout, responsive behaviour, accessible interaction and request error handling. |
| C-FS-J-SERVICE | LV-FS-J | Application services and data | Implement a small service and data interaction. | Verify contracts, input checks, permissions and transaction behaviour. |
| C-FS-J-QUALITY | LV-FS-J | Software quality and delivery | Fix a bounded defect and add tests within an existing workflow. | Reproduce the issue, check the change, review the code and run CI. |
| C-FS-M-UI | LV-FS-M | Web interface development | Independently implement a usable web interface. | Explain interface decisions and resolve accessibility, layout and asynchronous state defects. |
| C-FS-M-SERVICE | LV-FS-M | Application services and data | Integrate interface, services and storage into a complete feature. | Demonstrate cross-layer error handling, authorization and consistent updates. |
| C-FS-M-QUALITY | LV-FS-M | Software quality and delivery | Test and review changes across a complete feature. | Provide regression evidence and justified implementation improvements. |
| C-FS-S-UI | LV-FS-S | Web interface development | Review interface solutions and guide improvements. | Support design recommendations with user-flow evidence and accessibility checks. |
| C-FS-S-SERVICE | LV-FS-S | Application services and data | Design complex service integration and justify trade-offs. | Review interfaces and failure modes with evidence for security and data consistency. |
| C-FS-S-QUALITY | LV-FS-S | Software quality and delivery | Lead technical review and improve delivery quality. | Explain review decisions and demonstrate more reliable code and integration checks. |
| C-QA-J-DESIGN | LV-QA-J | Test design and planning | Derive test cases from supplied requirements with guidance. | Include representative partitions, boundaries and initial risk priorities. |
| C-QA-J-EXEC | LV-QA-J | Test execution and defect evidence | Run tests and report reproducible defects. | Record test data, environment, expected results, observed failures and impact. |
| C-QA-J-AUTO | LV-QA-J | Test automation and integration | Add automated checks using an existing structure. | Demonstrate assertions, repeatability, a guided workload test and flaky-result investigation. |
| C-QA-M-DESIGN | LV-QA-M | Test design and planning | Design a risk-based test suite and exploratory activities. | Trace tests to requirements and justify selected cases and priorities. |
| C-QA-M-EXEC | LV-QA-M | Test execution and defect evidence | Investigate defects and communicate test consequences. | Provide reproducible evidence, retest results and regression findings. |
| C-QA-M-AUTO | LV-QA-M | Test automation and integration | Build automated checks for component interactions. | Provide reliable integration tests and interpretable workload measurements. |
| C-QA-S-DESIGN | LV-QA-S | Test design and planning | Review team test scope and priorities. | Explain coverage gaps, risk choices and improvements to the test approach. |
| C-QA-S-EXEC | LV-QA-S | Test execution and defect evidence | Synthesize test evidence for a release decision. | State remaining defects, product impact and the limits of available test evidence. |
| C-QA-S-AUTO | LV-QA-S | Test automation and integration | Design an automation approach for a team. | Evaluate maintainability, flakiness and performance coverage and verify improvements. |

## LearningModule and pathway decision

Confirmed scope: provide learning content on the platform and model skill prerequisites. Every module is LESSON_AND_PRACTICE, with contentUri, contentType and contentVersion referencing a real Markdown file. The package contains 72 module files and 12 shared topic lessons with worked examples and self-checks. External resources are supplementary official links; the local introductions are authored material. The files still need deployment and organizational content review.

Twenty local HAS_PREREQUISITE edges augment the original 558 relationships, making 578 in total. They support learning readiness and pathway ordering, not automatic role-attainment requirements. See the field document for approval, cycle, cross-role bridging and module-order conflict rules.

## Courses

| id | title | description |
|---|---|---|
| CRS-DE-J-MODEL | Junior Data modelling and storage Course | Learning and practice collection covering Data modelling and storage at Junior level for Data Engineering. Outcome: Build a small data model and warehouse structure from supplied requirements. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-J-PIPE | Junior Data pipeline implementation and integration Course | Learning and practice collection covering Data pipeline implementation and integration at Junior level for Data Engineering. Outcome: Implement a small data flow from an existing design. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-J-QUAL | Junior Data quality and operations Course | Learning and practice collection covering Data quality and operations at Junior level for Data Engineering. Outcome: Check data quality and record operational issues under guidance. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-M-MODEL | Middle Data modelling and storage Course | Learning and practice collection covering Data modelling and storage at Middle level for Data Engineering. Outcome: Design a data model supporting several consumers. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-M-PIPE | Middle Data pipeline implementation and integration Course | Learning and practice collection covering Data pipeline implementation and integration at Middle level for Data Engineering. Outcome: Independently implement an integrated data pipeline. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-M-QUAL | Middle Data quality and operations Course | Learning and practice collection covering Data quality and operations at Middle level for Data Engineering. Outcome: Investigate data failures across a pipeline. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-S-MODEL | Senior Data modelling and storage Course | Learning and practice collection covering Data modelling and storage at Senior level for Data Engineering. Outcome: Review data designs across domains and recommend improvements. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-S-PIPE | Senior Data pipeline implementation and integration Course | Learning and practice collection covering Data pipeline implementation and integration at Senior level for Data Engineering. Outcome: Design a complex pipeline and justify its operational approach. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-DE-S-QUAL | Senior Data quality and operations Course | Learning and practice collection covering Data quality and operations at Senior level for Data Engineering. Outcome: Define quality controls and monitoring for a data solution. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-J-DATA | Junior ML data preparation Course | Learning and practice collection covering ML data preparation at Junior level for AI Engineering. Outcome: Prepare modelling data using an established procedure. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-J-MODEL | Junior Model development and evaluation Course | Learning and practice collection covering Model development and evaluation at Junior level for AI Engineering. Outcome: Train and evaluate a baseline for a defined ML task. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-J-OPS | Junior Model deployment and operations Course | Learning and practice collection covering Model deployment and operations at Junior level for AI Engineering. Outcome: Package a model and run a guided integration trial. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-M-DATA | Middle ML data preparation Course | Learning and practice collection covering ML data preparation at Middle level for AI Engineering. Outcome: Design preprocessing and feature preparation for a modelling task. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-M-MODEL | Middle Model development and evaluation Course | Learning and practice collection covering Model development and evaluation at Middle level for AI Engineering. Outcome: Compare models and select one against the problem objective. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-M-OPS | Middle Model deployment and operations Course | Learning and practice collection covering Model deployment and operations at Middle level for AI Engineering. Outcome: Integrate a model and maintain its operational workflow. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-S-DATA | Senior ML data preparation Course | Learning and practice collection covering ML data preparation at Senior level for AI Engineering. Outcome: Review the data preparation approach for an ML solution. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-S-MODEL | Senior Model development and evaluation Course | Learning and practice collection covering Model development and evaluation at Senior level for AI Engineering. Outcome: Design model evaluation to support an adoption decision. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-AI-S-OPS | Senior Model deployment and operations Course | Learning and practice collection covering Model deployment and operations at Senior level for AI Engineering. Outcome: Design model operations and response to performance deterioration. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-J-UI | Junior Web interface development Course | Learning and practice collection covering Web interface development at Junior level for Full-stack Development. Outcome: Build a web interface from supplied requirements. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-J-SERVICE | Junior Application services and data Course | Learning and practice collection covering Application services and data at Junior level for Full-stack Development. Outcome: Implement a small service and data interaction. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-J-QUALITY | Junior Software quality and delivery Course | Learning and practice collection covering Software quality and delivery at Junior level for Full-stack Development. Outcome: Fix a bounded defect and add tests within an existing workflow. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-M-UI | Middle Web interface development Course | Learning and practice collection covering Web interface development at Middle level for Full-stack Development. Outcome: Independently implement a usable web interface. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-M-SERVICE | Middle Application services and data Course | Learning and practice collection covering Application services and data at Middle level for Full-stack Development. Outcome: Integrate interface, services and storage into a complete feature. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-M-QUALITY | Middle Software quality and delivery Course | Learning and practice collection covering Software quality and delivery at Middle level for Full-stack Development. Outcome: Test and review changes across a complete feature. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-S-UI | Senior Web interface development Course | Learning and practice collection covering Web interface development at Senior level for Full-stack Development. Outcome: Review interface solutions and guide improvements. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-S-SERVICE | Senior Application services and data Course | Learning and practice collection covering Application services and data at Senior level for Full-stack Development. Outcome: Design complex service integration and justify trade-offs. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-FS-S-QUALITY | Senior Software quality and delivery Course | Learning and practice collection covering Software quality and delivery at Senior level for Full-stack Development. Outcome: Lead technical review and improve delivery quality. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-J-DESIGN | Junior Test design and planning Course | Learning and practice collection covering Test design and planning at Junior level for Software Testing. Outcome: Derive test cases from supplied requirements with guidance. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-J-EXEC | Junior Test execution and defect evidence Course | Learning and practice collection covering Test execution and defect evidence at Junior level for Software Testing. Outcome: Run tests and report reproducible defects. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-J-AUTO | Junior Test automation and integration Course | Learning and practice collection covering Test automation and integration at Junior level for Software Testing. Outcome: Add automated checks using an existing structure. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-M-DESIGN | Middle Test design and planning Course | Learning and practice collection covering Test design and planning at Middle level for Software Testing. Outcome: Design a risk-based test suite and exploratory activities. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-M-EXEC | Middle Test execution and defect evidence Course | Learning and practice collection covering Test execution and defect evidence at Middle level for Software Testing. Outcome: Investigate defects and communicate test consequences. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-M-AUTO | Middle Test automation and integration Course | Learning and practice collection covering Test automation and integration at Middle level for Software Testing. Outcome: Build automated checks for component interactions. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-S-DESIGN | Senior Test design and planning Course | Learning and practice collection covering Test design and planning at Senior level for Software Testing. Outcome: Review team test scope and priorities. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-S-EXEC | Senior Test execution and defect evidence Course | Learning and practice collection covering Test execution and defect evidence at Senior level for Software Testing. Outcome: Synthesize test evidence for a release decision. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |
| CRS-QA-S-AUTO | Senior Test automation and integration Course | Learning and practice collection covering Test automation and integration at Senior level for Software Testing. Outcome: Design an automation approach for a team. Includes local Markdown lessons, official learning resources, practice tasks and evidence instructions. |

## LearningModules

| id | title | moduleType | learningOutcome |
|---|---|---|---|
| MOD-DE-J-MODEL-01 | Junior Data modelling and storage - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following junior tasks:<br>MS-DE01: Create an entity model from supplied requirements; verify keys and relationships against sample records.<br>MS-DE03: Build and load a small warehouse using a supplied schema and reconcile source-to-target counts.<br>MS-DE06: Fill a supplied data dictionary with field meanings, owners and structural metadata.<br>Submit evidence:<br>MS-DE01: Model diagram, schema, constraint checks and design rationale.<br>MS-DE03: Warehouse schema, load scripts, history tests and reconciliation results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings. |
| MOD-DE-J-MODEL-02 | Junior Data modelling and storage - Module 2: Guided validation | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following junior tasks:<br>MS-DE13: Measure a supplied warehouse query before and after one guided optimisation; confirm unchanged results.<br>MS-DE16: Identify downstream consumers of a supplied dataset change using existing lineage information.<br>Submit evidence:<br>MS-DE13: Workload definition, before/after measurements, result reconciliation and decision record.<br>MS-DE16: Dependency map, affected-consumer list, assumptions and change verification results. |
| MOD-DE-J-PIPE-01 | Junior Data pipeline implementation and integration - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following junior tasks:<br>MS-DE02: Implement a supplied transformation specification and verify expected outputs with guidance.<br>MS-DE04: Document source fields, target fields and supplied transformations in a mapping template.<br>MS-DE08: Describe a source-to-destination flow from a supplied integration design.<br>Submit evidence:<br>MS-DE02: Runnable application, input/output fixtures, test results and execution logs.<br>MS-DE04: Mapping document, sample transformations, exception decisions and validation results.<br>MS-DE08: Flow diagram, contracts, failure scenarios and design decisions. |
| MOD-DE-J-PIPE-02 | Junior Data pipeline implementation and integration - Module 2: Guided validation | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following junior tasks:<br>MS-DE10: Extract a supplied source into staging and reconcile record counts with guidance.<br>MS-DE11: Implement supplied transformation rules and check outputs against worked examples.<br>MS-DE12: Run a provided task sequence; demonstrate a safe retry using a supplied failure case.<br>Submit evidence:<br>MS-DE10: Extraction code, checkpoints, reconciliation and recovery test logs.<br>MS-DE11: Rule specification, transformation code, edge-case fixtures and test results.<br>MS-DE12: Dependency graph, orchestration configuration and repeated-run/failure test results. |
| MOD-DE-J-QUAL-01 | Junior Data quality and operations - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following junior tasks:<br>MS-DE05: Run supplied completeness, accuracy and consistency checks; record failures with guidance.<br>MS-DE06: Fill a supplied data dictionary with field meanings, owners and structural metadata.<br>MS-DE07: Read pipeline logs and alerts; reproduce a known failure and document escalation with guidance.<br>Submit evidence:<br>MS-DE05: Quality rules, failing records, investigation notes and rerun results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings.<br>MS-DE07: Run logs, alert examples, incident timeline and recovery verification. |
| MOD-DE-J-QUAL-02 | Junior Data quality and operations - Module 2: Guided validation | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following junior tasks:<br>MS-DE09: Profile a supplied dataset for missing values, duplicates and distributions using a checklist.<br>MS-DE14: Apply a supplied access and handling policy; verify an allowed and a denied operation with guidance.<br>MS-DE15: Write tests for a supplied transformation and a small end-to-end pipeline with guidance.<br>Submit evidence:<br>MS-DE09: Profiling output, anomaly examples, risk assessment and sampling rationale.<br>MS-DE14: Permission configuration, allow/deny tests and data-handling review.<br>MS-DE15: Test code, fixtures, coverage rationale and execution results. |
| MOD-DE-M-MODEL-01 | Middle Data modelling and storage - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following middle tasks:<br>MS-DE01: Independently design a model for multiple consumers; validate constraints and explain normalisation choices.<br>MS-DE03: Design warehouse grain and incremental loads; validate history handling and reconciliation independently.<br>MS-DE06: Maintain metadata through schema changes; verify definitions with owners and dependent consumers.<br>Submit evidence:<br>MS-DE01: Model diagram, schema, constraint checks and design rationale.<br>MS-DE03: Warehouse schema, load scripts, history tests and reconciliation results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings. |
| MOD-DE-M-MODEL-02 | Middle Data modelling and storage - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following middle tasks:<br>MS-DE13: Diagnose a slow workload and select an optimisation using measured runtime and loading cost independently.<br>MS-DE16: Trace dependencies across pipeline stages; validate affected consumers before a change independently.<br>Submit evidence:<br>MS-DE13: Workload definition, before/after measurements, result reconciliation and decision record.<br>MS-DE16: Dependency map, affected-consumer list, assumptions and change verification results. |
| MOD-DE-M-PIPE-01 | Middle Data pipeline implementation and integration - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following middle tasks:<br>MS-DE02: Build a processing application that handles invalid records, repeat runs and routine failures independently.<br>MS-DE04: Resolve ambiguous mappings with stakeholders; validate types, defaults and exceptional records independently.<br>MS-DE08: Design an integration flow with dependencies, interface contracts and failure handling independently.<br>Submit evidence:<br>MS-DE02: Runnable application, input/output fixtures, test results and execution logs.<br>MS-DE04: Mapping document, sample transformations, exception decisions and validation results.<br>MS-DE08: Flow diagram, contracts, failure scenarios and design decisions. |
| MOD-DE-M-PIPE-02 | Middle Data pipeline implementation and integration - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following middle tasks:<br>MS-DE10: Implement incremental extraction with checkpoints, schema checks and restart handling independently.<br>MS-DE11: Resolve edge cases in business rules; implement and test deterministic transformations independently.<br>MS-DE12: Implement dependent tasks with idempotent writes and recovery checks independently.<br>Submit evidence:<br>MS-DE10: Extraction code, checkpoints, reconciliation and recovery test logs.<br>MS-DE11: Rule specification, transformation code, edge-case fixtures and test results.<br>MS-DE12: Dependency graph, orchestration configuration and repeated-run/failure test results. |
| MOD-DE-M-QUAL-01 | Middle Data quality and operations - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following middle tasks:<br>MS-DE05: Define dataset-specific quality checks, investigate failures and verify corrections independently.<br>MS-DE06: Maintain metadata through schema changes; verify definitions with owners and dependent consumers.<br>MS-DE07: Diagnose routine production failures; restore execution safely and validate the resulting data independently.<br>Submit evidence:<br>MS-DE05: Quality rules, failing records, investigation notes and rerun results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings.<br>MS-DE07: Run logs, alert examples, incident timeline and recovery verification. |
| MOD-DE-M-QUAL-02 | Middle Data quality and operations - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following middle tasks:<br>MS-DE09: Profile multiple sources independently; identify anomalous segments and quantify ingestion risks.<br>MS-DE14: Configure dataset permissions and handling controls independently; investigate an access-control failure.<br>MS-DE15: Design automated checks for boundaries, invalid input and routine pipeline failures independently.<br>Submit evidence:<br>MS-DE09: Profiling output, anomaly examples, risk assessment and sampling rationale.<br>MS-DE14: Permission configuration, allow/deny tests and data-handling review.<br>MS-DE15: Test code, fixtures, coverage rationale and execution results. |
| MOD-DE-S-MODEL-01 | Senior Data modelling and storage - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following senior tasks:<br>MS-DE01: Compare cross-domain model alternatives; justify performance and change-impact trade-offs and review another design.<br>MS-DE03: Compare warehouse structures and loading strategies under scale and change; justify the selected design.<br>MS-DE06: Review metadata coverage across domains; resolve conflicting definitions and propose ownership controls.<br>Submit evidence:<br>MS-DE01: Model diagram, schema, constraint checks and design rationale.<br>MS-DE03: Warehouse schema, load scripts, history tests and reconciliation results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings. |
| MOD-DE-S-MODEL-02 | Senior Data modelling and storage - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Data modelling and storage, demonstrate the following senior tasks:<br>MS-DE13: Compare optimisation strategies across competing workloads; justify cost, maintenance and performance trade-offs.<br>MS-DE16: Assess change impact across domains with incomplete lineage; justify rollout and verification priorities.<br>Submit evidence:<br>MS-DE13: Workload definition, before/after measurements, result reconciliation and decision record.<br>MS-DE16: Dependency map, affected-consumer list, assumptions and change verification results. |
| MOD-DE-S-PIPE-01 | Senior Data pipeline implementation and integration - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following senior tasks:<br>MS-DE02: Compare processing architectures under volume and failure constraints; review correctness and operating cost.<br>MS-DE04: Review mappings across systems; trace breaking changes and justify resolution of conflicting business definitions.<br>MS-DE08: Compare integration patterns across systems; justify consistency, latency and recovery trade-offs.<br>Submit evidence:<br>MS-DE02: Runnable application, input/output fixtures, test results and execution logs.<br>MS-DE04: Mapping document, sample transformations, exception decisions and validation results.<br>MS-DE08: Flow diagram, contracts, failure scenarios and design decisions. |
| MOD-DE-S-PIPE-02 | Senior Data pipeline implementation and integration - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Data pipeline implementation and integration, demonstrate the following senior tasks:<br>MS-DE10: Compare extraction approaches under source limits and schema changes; verify recovery without omissions or duplicates.<br>MS-DE11: Review conflicting transformation approaches; justify semantic correctness and control downstream change impact.<br>MS-DE12: Design orchestration for partial failures and concurrent runs; justify retry boundaries and verify output consistency.<br>Submit evidence:<br>MS-DE10: Extraction code, checkpoints, reconciliation and recovery test logs.<br>MS-DE11: Rule specification, transformation code, edge-case fixtures and test results.<br>MS-DE12: Dependency graph, orchestration configuration and repeated-run/failure test results. |
| MOD-DE-S-QUAL-01 | Senior Data quality and operations - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following senior tasks:<br>MS-DE05: Design quality controls across a data solution; evaluate false alarms, missed failures and ownership.<br>MS-DE06: Review metadata coverage across domains; resolve conflicting definitions and propose ownership controls.<br>MS-DE07: Design monitoring and incident response across pipelines; assess alert coverage and recovery trade-offs.<br>Submit evidence:<br>MS-DE05: Quality rules, failing records, investigation notes and rerun results.<br>MS-DE06: Data dictionary, ownership records, change history and review findings.<br>MS-DE07: Run logs, alert examples, incident timeline and recovery verification. |
| MOD-DE-S-QUAL-02 | Senior Data quality and operations - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Data quality and operations, demonstrate the following senior tasks:<br>MS-DE09: Design a profiling approach for changing sources; prioritise risks and validate whether sampling misses important defects.<br>MS-DE14: Review data flows for access and handling gaps; justify controls and verify high-impact failure scenarios.<br>MS-DE15: Review pipeline test coverage across components; prioritise high-impact failures and verify proposed improvements.<br>Submit evidence:<br>MS-DE09: Profiling output, anomaly examples, risk assessment and sampling rationale.<br>MS-DE14: Permission configuration, allow/deny tests and data-handling review.<br>MS-DE15: Test code, fixtures, coverage rationale and execution results. |
| MOD-AI-J-DATA-01 | Junior ML data preparation - Module 1: Guided implementation | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following junior tasks:<br>MS-AI01: Assemble a dataset from supplied sources and document target labels with guidance.<br>MS-AI02: Apply a provided train/test split and fit preprocessing on training data only with guidance.<br>MS-AI03: Construct supplied features and check their values against examples with guidance.<br>Submit evidence:<br>MS-AI01: Dataset manifest, label checks, inclusion rules and dataset summary.<br>MS-AI02: Preprocessing pipeline, fit boundaries, split records and leakage tests.<br>MS-AI03: Feature definitions, baseline comparison, validation results and feature checks. |
| MOD-AI-J-DATA-02 | Junior ML data preparation - Module 2: Guided validation | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following junior tasks:<br>MS-AI09: Apply a supplied split strategy and verify separation of training and evaluation records.<br>MS-AI12: Report class frequencies and compute supplied minority-class metrics with guidance.<br>Submit evidence:<br>MS-AI09: Split code, partition manifests, overlap tests and strategy rationale.<br>MS-AI12: Class counts, per-class metrics, error examples and threshold rationale. |
| MOD-AI-J-MODEL-01 | Junior Model development and evaluation - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following junior tasks:<br>MS-AI04: Apply a supplied learning method to a bounded task and explain its inputs and outputs.<br>MS-AI05: Train a baseline model on an identified dataset using a supplied procedure.<br>MS-AI06: Compute supplied evaluation metrics and interpret baseline errors with guidance.<br>Submit evidence:<br>MS-AI04: Task formulation, candidate methods, baseline results and method rationale.<br>MS-AI05: Training code, model artifacts, experiment records and model comparison.<br>MS-AI06: Evaluation protocol, metric results, segment analysis and decision rationale. |
| MOD-AI-J-MODEL-02 | Junior Model development and evaluation - Module 2: Guided validation | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following junior tasks:<br>MS-AI10: Run a supplied cross-validation procedure without using the final test set for selection.<br>MS-AI11: Run a bounded parameter experiment using a supplied search space and validation set.<br>MS-AI13: Summarise confusion patterns or residuals for a baseline using a supplied template.<br>Submit evidence:<br>MS-AI10: Fold definitions, preprocessing boundaries, fold results and final-test access record.<br>MS-AI11: Search configuration, budget, trial log and selection rationale.<br>MS-AI13: Error analysis, segmented results, example failures and mitigation checks. |
| MOD-AI-J-OPS-01 | Junior Model deployment and operations - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following junior tasks:<br>MS-AI07: Save, reload and expose a model using a supplied runtime; verify example predictions with guidance.<br>MS-AI08: Collect supplied model-quality and service metrics; identify a known alert condition with guidance.<br>MS-FS05: Connect supplied components and verify a bounded end-to-end scenario with guidance.<br>Submit evidence:<br>MS-AI07: Model package, environment specification, service checks and deployment records.<br>MS-AI08: Monitoring definitions, metric history, alert examples and investigation evidence.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-AI-J-OPS-02 | Junior Model deployment and operations - Module 2: Guided validation | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following junior tasks:<br>MS-AI14: Record seeds, parameters and environment details; repeat a supplied experiment with guidance.<br>MS-AI15: Run supplied contract checks for prediction inputs and outputs in a guided integration trial.<br>MS-AI16: Document a maintenance runbook from a supplied deterioration scenario with guidance.<br>Submit evidence:<br>MS-AI14: Run manifest, version records, repeated-run outputs and difference analysis.<br>MS-AI15: Contracts, integration tests, request/response fixtures and failure results.<br>MS-AI16: Maintenance runbook, trigger rationale, revalidation results and rehearsal record. |
| MOD-AI-M-DATA-01 | Middle ML data preparation - Module 1: Independent implementation | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following middle tasks:<br>MS-AI01: Build a dataset for a defined modelling task independently; validate labels, duplicates and inclusion rules.<br>MS-AI02: Build a reproducible preprocessing pipeline; test leakage boundaries across validation folds independently.<br>MS-AI03: Select or construct features using validation evidence; compare with a baseline independently.<br>Submit evidence:<br>MS-AI01: Dataset manifest, label checks, inclusion rules and dataset summary.<br>MS-AI02: Preprocessing pipeline, fit boundaries, split records and leakage tests.<br>MS-AI03: Feature definitions, baseline comparison, validation results and feature checks. |
| MOD-AI-M-DATA-02 | Middle ML data preparation - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following middle tasks:<br>MS-AI09: Choose random, stratified, grouped or temporal splits based on data dependencies independently.<br>MS-AI12: Choose imbalance-sensitive metrics and inspect minority-class errors across splits independently.<br>Submit evidence:<br>MS-AI09: Split code, partition manifests, overlap tests and strategy rationale.<br>MS-AI12: Class counts, per-class metrics, error examples and threshold rationale. |
| MOD-AI-M-MODEL-01 | Middle Model development and evaluation - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following middle tasks:<br>MS-AI04: Choose an appropriate learning method using task assumptions and baseline evidence independently.<br>MS-AI05: Build and compare predictive models with reproducible training and consistent validation independently.<br>MS-AI06: Select metrics aligned to the task; compare models under one consistent protocol independently.<br>Submit evidence:<br>MS-AI04: Task formulation, candidate methods, baseline results and method rationale.<br>MS-AI05: Training code, model artifacts, experiment records and model comparison.<br>MS-AI06: Evaluation protocol, metric results, segment analysis and decision rationale. |
| MOD-AI-M-MODEL-02 | Middle Model development and evaluation - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following middle tasks:<br>MS-AI10: Configure valid folds and fold-local preprocessing; compare training procedures independently.<br>MS-AI11: Define a search space and budget; select settings from reproducible validation evidence independently.<br>MS-AI13: Identify systematic error segments and validate a proposed explanation independently.<br>Submit evidence:<br>MS-AI10: Fold definitions, preprocessing boundaries, fold results and final-test access record.<br>MS-AI11: Search configuration, budget, trial log and selection rationale.<br>MS-AI13: Error analysis, segmented results, example failures and mitigation checks. |
| MOD-AI-M-OPS-01 | Middle Model deployment and operations - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following middle tasks:<br>MS-AI07: Package and deploy a reproducible model service; verify dependencies, inputs and routine failure handling independently.<br>MS-AI08: Configure monitoring and investigate a deterioration in quality or service behaviour independently.<br>MS-FS05: Integrate components independently; verify contracts, error propagation and consistent data flow.<br>Submit evidence:<br>MS-AI07: Model package, environment specification, service checks and deployment records.<br>MS-AI08: Monitoring definitions, metric history, alert examples and investigation evidence.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-AI-M-OPS-02 | Middle Model deployment and operations - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following middle tasks:<br>MS-AI14: Reproduce a run from recorded data, code and environment versions independently; explain any variation.<br>MS-AI15: Build integration tests for valid, invalid and incompatible requests independently.<br>MS-AI16: Define and test retraining and revalidation steps, including a rollback decision, independently.<br>Submit evidence:<br>MS-AI14: Run manifest, version records, repeated-run outputs and difference analysis.<br>MS-AI15: Contracts, integration tests, request/response fixtures and failure results.<br>MS-AI16: Maintenance runbook, trigger rationale, revalidation results and rehearsal record. |
| MOD-AI-S-DATA-01 | Senior ML data preparation - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following senior tasks:<br>MS-AI01: Review alternative dataset constructions; justify representativeness, label quality and known limitations.<br>MS-AI02: Review leakage risks across data preparation and evaluation; demonstrate mitigations for hidden or temporal leakage.<br>MS-AI03: Review feature alternatives under leakage, stability and serving constraints; justify the selected representation.<br>Submit evidence:<br>MS-AI01: Dataset manifest, label checks, inclusion rules and dataset summary.<br>MS-AI02: Preprocessing pipeline, fit boundaries, split records and leakage tests.<br>MS-AI03: Feature definitions, baseline comparison, validation results and feature checks. |
| MOD-AI-S-DATA-02 | Senior ML data preparation - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In ML data preparation, demonstrate the following senior tasks:<br>MS-AI09: Review split alternatives for a complex deployment setting; expose contamination risks and justify representativeness.<br>MS-AI12: Review imbalance evaluation under changing class frequencies and error costs; justify decision thresholds.<br>Submit evidence:<br>MS-AI09: Split code, partition manifests, overlap tests and strategy rationale.<br>MS-AI12: Class counts, per-class metrics, error examples and threshold rationale. |
| MOD-AI-S-MODEL-01 | Senior Model development and evaluation - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following senior tasks:<br>MS-AI04: Compare method families for a complex task; justify assumptions, adoption risks and limits of the recommendation.<br>MS-AI05: Review model alternatives under operational constraints; justify the selected model and document failure limits.<br>MS-AI06: Design evaluation for an adoption decision; analyse segment failures, uncertainty and metric trade-offs.<br>Submit evidence:<br>MS-AI04: Task formulation, candidate methods, baseline results and method rationale.<br>MS-AI05: Training code, model artifacts, experiment records and model comparison.<br>MS-AI06: Evaluation protocol, metric results, segment analysis and decision rationale. |
| MOD-AI-S-MODEL-02 | Senior Model development and evaluation - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Model development and evaluation, demonstrate the following senior tasks:<br>MS-AI10: Design and review validation for grouped or temporal data; assess variability and selection bias.<br>MS-AI11: Compare search strategies under compute constraints; justify gains, stability and avoidance of test-set overfitting.<br>MS-AI13: Compare failure patterns across candidate models; prioritise mitigations and state unresolved limitations.<br>Submit evidence:<br>MS-AI10: Fold definitions, preprocessing boundaries, fold results and final-test access record.<br>MS-AI11: Search configuration, budget, trial log and selection rationale.<br>MS-AI13: Error analysis, segmented results, example failures and mitigation checks. |
| MOD-AI-S-OPS-01 | Senior Model deployment and operations - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following senior tasks:<br>MS-AI07: Compare deployment approaches under compatibility and rollback constraints; verify a controlled release plan.<br>MS-AI08: Design monitoring for delayed labels and changing data; justify triggers and validate the incident response.<br>MS-FS05: Design cross-component integration under partial failure; compare alternatives and review compatibility risks.<br>Submit evidence:<br>MS-AI07: Model package, environment specification, service checks and deployment records.<br>MS-AI08: Monitoring definitions, metric history, alert examples and investigation evidence.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-AI-S-OPS-02 | Senior Model deployment and operations - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Model deployment and operations, demonstrate the following senior tasks:<br>MS-AI14: Review experiment reproducibility across environments; define tolerance and investigate unexplained divergence.<br>MS-AI15: Review service contracts across consumers; test compatibility and high-impact integration failures before release.<br>MS-AI16: Design maintenance triggers and release decisions under drift; compare response options and verify a rehearsal.<br>Submit evidence:<br>MS-AI14: Run manifest, version records, repeated-run outputs and difference analysis.<br>MS-AI15: Contracts, integration tests, request/response fixtures and failure results.<br>MS-AI16: Maintenance runbook, trigger rationale, revalidation results and rehearsal record. |
| MOD-FS-J-UI-01 | Junior Web interface development - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following junior tasks:<br>MS-FS01: Specify screens and interactions for a supplied user task using a guided wireframe.<br>MS-FS02: Implement a supplied interface with keyboard navigation and labelled controls; run guided checks.<br>MS-FS09: Implement a supplied layout at specified viewport sizes and verify overflow with guidance.<br>Submit evidence:<br>MS-FS01: Wireframes, interaction states, requirement mapping and user-flow review.<br>MS-FS02: Interface implementation, keyboard/focus checks, assistive-technology observations and fixes.<br>MS-FS09: Implementation, viewport evidence, overflow checks and layout rationale. |
| MOD-FS-J-UI-02 | Junior Web interface development - Module 2: Guided validation | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following junior tasks:<br>MS-FS10: Choose HTML elements for supplied content and interactions; check structure with guidance.<br>MS-FS11: Handle success and failure responses in a supplied interface with guidance.<br>Submit evidence:<br>MS-FS10: Markup, structure checks, interaction examples and review notes.<br>MS-FS11: Request-handling code, state transitions and error/cancellation/race tests. |
| MOD-FS-J-SERVICE-01 | Junior Application services and data - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following junior tasks:<br>MS-FS03: Define a small component interface from a supplied contract template with guidance.<br>MS-FS04: Write queries for supplied retrieval and update tasks; verify results against sample records.<br>MS-FS05: Connect supplied components and verify a bounded end-to-end scenario with guidance.<br>Submit evidence:<br>MS-FS03: Interface specification, request/response examples, contract tests and design rationale.<br>MS-FS04: Query scripts, expected results, edge-case data and execution measurements.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-FS-J-SERVICE-02 | Junior Application services and data - Module 2: Guided validation | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following junior tasks:<br>MS-FS12: Implement supplied client and server input constraints; check valid and invalid examples with guidance.<br>MS-FS13: Apply a supplied permission rule to a protected action; verify allowed and denied cases.<br>MS-FS14: Implement a supplied atomic update and demonstrate rollback on a guided failure.<br>Submit evidence:<br>MS-FS12: Validation rules, client/server code and boundary/bypass test results.<br>MS-FS13: Permission matrix, authorization checks and allow/deny/bypass tests.<br>MS-FS14: Transaction code, boundary rationale and rollback/concurrency results. |
| MOD-FS-J-QUALITY-01 | Junior Software quality and delivery - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following junior tasks:<br>MS-FS06: Reproduce a bounded defect and verify a guided fix with a regression check.<br>MS-FS07: Add automated unit tests for a supplied function with meaningful assertions and guidance.<br>MS-FS08: Review a bounded change using a supplied checklist and give actionable feedback.<br>Submit evidence:<br>MS-FS06: Reproduction steps, diagnostic evidence, patch and regression results.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale.<br>MS-FS08: Review comments, linked code changes, decision record and follow-up checks. |
| MOD-FS-J-QUALITY-02 | Junior Software quality and delivery - Module 2: Guided validation | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following junior tasks:<br>MS-FS15: Refactor a bounded implementation using supplied tests to preserve behaviour with guidance.<br>MS-FS16: Configure supplied build and test steps in an existing CI workflow with guidance.<br>Submit evidence:<br>MS-FS15: Before/after structure, change rationale and regression results.<br>MS-FS16: CI configuration, successful/failed runs and workflow decisions. |
| MOD-FS-M-UI-01 | Middle Web interface development - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following middle tasks:<br>MS-FS01: Design an end-to-end user flow independently; validate navigation and error states against requirements.<br>MS-FS02: Resolve keyboard, focus and assistive-technology interaction defects independently.<br>MS-FS09: Build responsive layouts independently; resolve content, resizing and interaction defects.<br>Submit evidence:<br>MS-FS01: Wireframes, interaction states, requirement mapping and user-flow review.<br>MS-FS02: Interface implementation, keyboard/focus checks, assistive-technology observations and fixes.<br>MS-FS09: Implementation, viewport evidence, overflow checks and layout rationale. |
| MOD-FS-M-UI-02 | Middle Web interface development - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following middle tasks:<br>MS-FS10: Implement semantic page structure independently and verify labels, headings and native controls.<br>MS-FS11: Implement loading, error and cancellation states independently; test stale responses and repeated requests.<br>Submit evidence:<br>MS-FS10: Markup, structure checks, interaction examples and review notes.<br>MS-FS11: Request-handling code, state transitions and error/cancellation/race tests. |
| MOD-FS-M-SERVICE-01 | Middle Application services and data - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following middle tasks:<br>MS-FS03: Design application contracts and error behaviour across components independently; test consumers.<br>MS-FS04: Develop queries with joins, constraints and boundary cases independently; verify correctness.<br>MS-FS05: Integrate components independently; verify contracts, error propagation and consistent data flow.<br>Submit evidence:<br>MS-FS03: Interface specification, request/response examples, contract tests and design rationale.<br>MS-FS04: Query scripts, expected results, edge-case data and execution measurements.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-FS-M-SERVICE-02 | Middle Application services and data - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following middle tasks:<br>MS-FS12: Define consistent validation across layers independently; test boundaries and usable error feedback.<br>MS-FS13: Implement authorization independently across actions and resources; test user and ownership boundaries.<br>MS-FS14: Design transaction boundaries independently; test consistency under failures and concurrent updates.<br>Submit evidence:<br>MS-FS12: Validation rules, client/server code and boundary/bypass test results.<br>MS-FS13: Permission matrix, authorization checks and allow/deny/bypass tests.<br>MS-FS14: Transaction code, boundary rationale and rollback/concurrency results. |
| MOD-FS-M-QUALITY-01 | Middle Software quality and delivery - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following middle tasks:<br>MS-FS06: Diagnose a defect across components independently; explain its cause and verify the fix.<br>MS-FS07: Design isolated unit tests for normal, boundary and failure behaviour independently.<br>MS-FS08: Review a feature change independently for correctness, tests and maintainability; verify resolved comments.<br>Submit evidence:<br>MS-FS06: Reproduction steps, diagnostic evidence, patch and regression results.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale.<br>MS-FS08: Review comments, linked code changes, decision record and follow-up checks. |
| MOD-FS-M-QUALITY-02 | Middle Software quality and delivery - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following middle tasks:<br>MS-FS15: Improve feature structure independently; add regression evidence and explain the design change.<br>MS-FS16: Build a repeatable CI workflow independently; diagnose failed checks and verify failure reporting.<br>Submit evidence:<br>MS-FS15: Before/after structure, change rationale and regression results.<br>MS-FS16: CI configuration, successful/failed runs and workflow decisions. |
| MOD-FS-S-UI-01 | Senior Web interface development - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following senior tasks:<br>MS-FS01: Review alternative interface designs across complex flows; justify recommendations using user-task evidence.<br>MS-FS02: Review accessibility across complex flows; prioritise barriers and verify design and implementation improvements.<br>MS-FS09: Review layout strategies across complex screens; justify breakpoints and validate representative device scenarios.<br>Submit evidence:<br>MS-FS01: Wireframes, interaction states, requirement mapping and user-flow review.<br>MS-FS02: Interface implementation, keyboard/focus checks, assistive-technology observations and fixes.<br>MS-FS09: Implementation, viewport evidence, overflow checks and layout rationale. |
| MOD-FS-S-UI-02 | Senior Web interface development - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Web interface development, demonstrate the following senior tasks:<br>MS-FS10: Review semantic patterns across reusable components; resolve ambiguous interaction roles and verify improvements.<br>MS-FS11: Review asynchronous state strategies under concurrency; justify race prevention and verify recovery paths.<br>Submit evidence:<br>MS-FS10: Markup, structure checks, interaction examples and review notes.<br>MS-FS11: Request-handling code, state transitions and error/cancellation/race tests. |
| MOD-FS-S-SERVICE-01 | Senior Application services and data - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following senior tasks:<br>MS-FS03: Compare interface alternatives under compatibility and failure constraints; justify evolution and migration decisions.<br>MS-FS04: Review complex queries and access patterns; justify correctness and performance trade-offs using evidence.<br>MS-FS05: Design cross-component integration under partial failure; compare alternatives and review compatibility risks.<br>Submit evidence:<br>MS-FS03: Interface specification, request/response examples, contract tests and design rationale.<br>MS-FS04: Query scripts, expected results, edge-case data and execution measurements.<br>MS-FS05: Integration diagram, runnable feature, contract checks and failure tests. |
| MOD-FS-S-SERVICE-02 | Senior Application services and data - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Application services and data, demonstrate the following senior tasks:<br>MS-FS12: Review validation across trust boundaries; justify shared rules and verify bypass and inconsistency scenarios.<br>MS-FS13: Review authorization design across services; justify policy decisions and verify high-impact bypass scenarios.<br>MS-FS14: Compare transaction strategies across complex interactions; justify consistency and recovery trade-offs.<br>Submit evidence:<br>MS-FS12: Validation rules, client/server code and boundary/bypass test results.<br>MS-FS13: Permission matrix, authorization checks and allow/deny/bypass tests.<br>MS-FS14: Transaction code, boundary rationale and rollback/concurrency results. |
| MOD-FS-S-QUALITY-01 | Senior Software quality and delivery - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following senior tasks:<br>MS-FS06: Lead investigation of an intermittent cross-component failure; compare hypotheses and review prevention measures.<br>MS-FS07: Review test quality and brittle dependencies; improve fault detection and verify the revised tests.<br>MS-FS08: Lead review of a complex change; justify trade-offs and coach reviewers using concrete evidence.<br>Submit evidence:<br>MS-FS06: Reproduction steps, diagnostic evidence, patch and regression results.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale.<br>MS-FS08: Review comments, linked code changes, decision record and follow-up checks. |
| MOD-FS-S-QUALITY-02 | Senior Software quality and delivery - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Software quality and delivery, demonstrate the following senior tasks:<br>MS-FS15: Review restructuring alternatives across components; justify migration risk and verify behaviour preservation.<br>MS-FS16: Review CI reliability across components; justify gating and dependency choices and verify failure recovery.<br>Submit evidence:<br>MS-FS15: Before/after structure, change rationale and regression results.<br>MS-FS16: CI configuration, successful/failed runs and workflow decisions. |
| MOD-QA-J-DESIGN-01 | Junior Test design and planning - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following junior tasks:<br>MS-QA01: Draft a test plan from supplied requirements using a template and guidance.<br>MS-QA02: Organise supplied test cases into a suite linked to requirements with guidance.<br>MS-QA08: Execute a supplied exploratory charter and record observations with guidance.<br>Submit evidence:<br>MS-QA01: Test plan, risk mapping, resource assumptions and completion criteria.<br>MS-QA02: Test suite, requirement traceability, coverage rationale and review results.<br>MS-QA08: Charters, session notes, findings and follow-up rationale. |
| MOD-QA-J-DESIGN-02 | Junior Test design and planning - Module 2: Guided validation | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following junior tasks:<br>MS-QA09: Identify valid and invalid input classes from supplied rules and choose representative cases with guidance.<br>MS-QA10: Select values at and around supplied input boundaries and record expected results with guidance.<br>MS-QA11: Rank supplied tests using a given likelihood-and-impact checklist with guidance.<br>Submit evidence:<br>MS-QA09: Partition model, selected cases, expected results and coverage rationale.<br>MS-QA10: Boundary table, test cases, expected/actual results and rationale.<br>MS-QA11: Risk register, prioritised tests, evidence sources and residual-risk statement. |
| MOD-QA-J-EXEC-01 | Junior Test execution and defect evidence - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following junior tasks:<br>MS-QA03: Execute supplied tests and record expected and observed results with guidance.<br>MS-QA04: Write a defect report with steps, expected and actual results using a supplied template.<br>MS-QA05: Reproduce a reported issue using supplied conditions and record the result with guidance.<br>Submit evidence:<br>MS-QA03: Execution log, environment details, expected/actual results and failure evidence.<br>MS-QA04: Defect reports, supporting evidence, test summary and decision notes.<br>MS-QA05: Reproduction steps, environment comparison, logs and controlled reruns. |
| MOD-QA-J-EXEC-02 | Junior Test execution and defect evidence - Module 2: Guided validation | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following junior tasks:<br>MS-QA12: Prepare supplied test data and environment settings; verify readiness with guidance.<br>MS-QA13: Classify defect severity using supplied impact examples and propose a priority with guidance.<br>MS-QA14: Run a supplied regression suite after a change and document differences with guidance.<br>Submit evidence:<br>MS-QA12: Data fixtures, environment manifest, readiness checks and repeatability evidence.<br>MS-QA13: Defect evidence, severity rationale, priority proposal and impact assessment.<br>MS-QA14: Change-impact map, selected tests, run results and failure investigation. |
| MOD-QA-J-AUTO-01 | Junior Test automation and integration - Module 1: Guided implementation | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following junior tasks:<br>MS-QA06: Add automated checks to an existing framework using supplied examples and guidance.<br>MS-QA07: Run guided integration tests for a supplied component interaction.<br>MS-FS07: Add automated unit tests for a supplied function with meaningful assertions and guidance.<br>Submit evidence:<br>MS-QA06: Automation code, fixtures, assertion rationale and repeat-run results.<br>MS-QA07: Interaction map, integration cases, execution results and failure evidence.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale. |
| MOD-QA-J-AUTO-02 | Junior Test automation and integration - Module 2: Guided validation | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following junior tasks:<br>MS-QA15: Execute a supplied workload in a controlled environment and report measurements with guidance.<br>MS-QA16: Rerun an inconsistent test under supplied controls and record failure patterns with guidance.<br>Submit evidence:<br>MS-QA15: Workload specification, environment details, measurements and interpretation.<br>MS-QA16: Rerun logs, controlled experiments, cause analysis and post-fix results. |
| MOD-QA-M-DESIGN-01 | Middle Test design and planning - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following middle tasks:<br>MS-QA01: Define scope, approach, resources and completion conditions independently based on product risks.<br>MS-QA02: Design a maintainable test suite independently; justify coverage and remove redundant cases.<br>MS-QA08: Design and run exploratory sessions independently based on risks and prior findings.<br>Submit evidence:<br>MS-QA01: Test plan, risk mapping, resource assumptions and completion criteria.<br>MS-QA02: Test suite, requirement traceability, coverage rationale and review results.<br>MS-QA08: Charters, session notes, findings and follow-up rationale. |
| MOD-QA-M-DESIGN-02 | Middle Test design and planning - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following middle tasks:<br>MS-QA09: Derive partitions independently from requirements; justify representatives and expected results.<br>MS-QA10: Derive boundaries independently, including inclusive/exclusive limits; verify selected cases.<br>MS-QA11: Prioritise tests independently using product impact, failure likelihood and available evidence.<br>Submit evidence:<br>MS-QA09: Partition model, selected cases, expected results and coverage rationale.<br>MS-QA10: Boundary table, test cases, expected/actual results and rationale.<br>MS-QA11: Risk register, prioritised tests, evidence sources and residual-risk statement. |
| MOD-QA-M-EXEC-01 | Middle Test execution and defect evidence - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following middle tasks:<br>MS-QA03: Execute a feature test cycle independently; investigate failures and maintain reproducible records.<br>MS-QA04: Communicate test results and defects independently with reproducible evidence and impact.<br>MS-QA05: Isolate reproduction conditions independently across data, environment and sequence differences.<br>Submit evidence:<br>MS-QA03: Execution log, environment details, expected/actual results and failure evidence.<br>MS-QA04: Defect reports, supporting evidence, test summary and decision notes.<br>MS-QA05: Reproduction steps, environment comparison, logs and controlled reruns. |
| MOD-QA-M-EXEC-02 | Middle Test execution and defect evidence - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following middle tasks:<br>MS-QA12: Create controlled data and environments independently; verify isolation and repeatability.<br>MS-QA13: Assess defect impact independently with reproducible evidence; explain severity and repair priority separately.<br>MS-QA14: Select and execute regression tests independently based on change impact; investigate new failures.<br>Submit evidence:<br>MS-QA12: Data fixtures, environment manifest, readiness checks and repeatability evidence.<br>MS-QA13: Defect evidence, severity rationale, priority proposal and impact assessment.<br>MS-QA14: Change-impact map, selected tests, run results and failure investigation. |
| MOD-QA-M-AUTO-01 | Middle Test automation and integration - Module 1: Independent implementation | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following middle tasks:<br>MS-QA06: Implement repeatable automated tests independently with meaningful assertions and controlled test data.<br>MS-QA07: Design and execute integration tests independently for contracts, data exchange and failures.<br>MS-FS07: Design isolated unit tests for normal, boundary and failure behaviour independently.<br>Submit evidence:<br>MS-QA06: Automation code, fixtures, assertion rationale and repeat-run results.<br>MS-QA07: Interaction map, integration cases, execution results and failure evidence.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale. |
| MOD-QA-M-AUTO-02 | Middle Test automation and integration - Module 2: Independent troubleshooting | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following middle tasks:<br>MS-QA15: Design a bounded performance test independently; interpret response, throughput and error results.<br>MS-QA16: Diagnose flaky tests independently by controlling data, timing and environment; verify a correction.<br>Submit evidence:<br>MS-QA15: Workload specification, environment details, measurements and interpretation.<br>MS-QA16: Rerun logs, controlled experiments, cause analysis and post-fix results. |
| MOD-QA-S-DESIGN-01 | Senior Test design and planning - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following senior tasks:<br>MS-QA01: Review team test strategy; justify coverage priorities and completion decisions under delivery constraints.<br>MS-QA02: Review suite structure across components; prioritise coverage gaps and validate proposed improvements.<br>MS-QA08: Review exploratory coverage across a product; prioritise charters and synthesize evidence for test decisions.<br>Submit evidence:<br>MS-QA01: Test plan, risk mapping, resource assumptions and completion criteria.<br>MS-QA02: Test suite, requirement traceability, coverage rationale and review results.<br>MS-QA08: Charters, session notes, findings and follow-up rationale. |
| MOD-QA-S-DESIGN-02 | Senior Test design and planning - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Test design and planning, demonstrate the following senior tasks:<br>MS-QA09: Review interacting partitions across complex rules; identify missing classes and justify reduced test combinations.<br>MS-QA10: Review boundaries across interacting rules and state transitions; prioritise off-by-one and limit-related risks.<br>MS-QA11: Review risk priorities under release constraints; justify changes and communicate untested residual risks.<br>Submit evidence:<br>MS-QA09: Partition model, selected cases, expected results and coverage rationale.<br>MS-QA10: Boundary table, test cases, expected/actual results and rationale.<br>MS-QA11: Risk register, prioritised tests, evidence sources and residual-risk statement. |
| MOD-QA-S-EXEC-01 | Senior Test execution and defect evidence - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following senior tasks:<br>MS-QA03: Review execution evidence across releases; identify unreliable results and justify follow-up testing.<br>MS-QA04: Synthesize test findings for a release decision; explain residual risk and evidence limitations.<br>MS-QA05: Review intermittent customer issues; compare hypotheses and define a minimal reproducible case or explicit evidence limits.<br>Submit evidence:<br>MS-QA03: Execution log, environment details, expected/actual results and failure evidence.<br>MS-QA04: Defect reports, supporting evidence, test summary and decision notes.<br>MS-QA05: Reproduction steps, environment comparison, logs and controlled reruns. |
| MOD-QA-S-EXEC-02 | Senior Test execution and defect evidence - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Test execution and defect evidence, demonstrate the following senior tasks:<br>MS-QA12: Review environment and data strategies across suites; diagnose instability and justify maintenance controls.<br>MS-QA13: Review disputed defect classifications; justify release consequences using exposure, workarounds and evidence limits.<br>MS-QA14: Review regression strategy across releases; justify coverage versus execution cost and verify improvements.<br>Submit evidence:<br>MS-QA12: Data fixtures, environment manifest, readiness checks and repeatability evidence.<br>MS-QA13: Defect evidence, severity rationale, priority proposal and impact assessment.<br>MS-QA14: Change-impact map, selected tests, run results and failure investigation. |
| MOD-QA-S-AUTO-01 | Senior Test automation and integration - Module 1: Design review and trade-offs | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following senior tasks:<br>MS-QA06: Design an automation approach for team maintenance; compare alternatives and verify reliability improvements.<br>MS-QA07: Review cross-system integration coverage; prioritise high-impact failures and verify recovery behaviour.<br>MS-FS07: Review test quality and brittle dependencies; improve fault detection and verify the revised tests.<br>Submit evidence:<br>MS-QA06: Automation code, fixtures, assertion rationale and repeat-run results.<br>MS-QA07: Interaction map, integration cases, execution results and failure evidence.<br>MS-FS07: Unit tests, fixtures, execution results and assertion rationale. |
| MOD-QA-S-AUTO-02 | Senior Test automation and integration - Module 2: Complex validation and improvement | LESSON_AND_PRACTICE | In Test automation and integration, demonstrate the following senior tasks:<br>MS-QA15: Review performance coverage and bottlenecks; compare workload assumptions and justify conclusions and limits.<br>MS-QA16: Review flakiness across a suite; prioritise causes and verify that reliability improvements preserve fault detection.<br>Submit evidence:<br>MS-QA15: Workload specification, environment details, measurements and interpretation.<br>MS-QA16: Rerun logs, controlled experiments, cause analysis and post-fix results. |

## Current competency-to-skill requirements

All thresholds below are inclusive internal cut-offs, not external standards. The authoritative per-edge task/evidence is expectedOutcome in the seed and workbook. Every row references RUB-SKILL-01 / 1.1.

| Competency | Requirements |
|---|---|
| C-DE-J-MODEL | MS-DE01 >= 0.60; MS-DE03 >= 0.60; MS-DE06 >= 0.60; MS-DE13 >= 0.60; MS-DE16 >= 0.60 |
| C-DE-J-PIPE | MS-DE02 >= 0.60; MS-DE04 >= 0.60; MS-DE08 >= 0.60; MS-DE10 >= 0.60; MS-DE11 >= 0.60; MS-DE12 >= 0.60 |
| C-DE-J-QUAL | MS-DE05 >= 0.65; MS-DE06 >= 0.60; MS-DE07 >= 0.60; MS-DE09 >= 0.60; MS-DE14 >= 0.65; MS-DE15 >= 0.65 |
| C-DE-M-MODEL | MS-DE01 >= 0.75; MS-DE03 >= 0.75; MS-DE06 >= 0.75; MS-DE13 >= 0.75; MS-DE16 >= 0.75 |
| C-DE-M-PIPE | MS-DE02 >= 0.75; MS-DE04 >= 0.75; MS-DE08 >= 0.75; MS-DE10 >= 0.75; MS-DE11 >= 0.75; MS-DE12 >= 0.75 |
| C-DE-M-QUAL | MS-DE05 >= 0.80; MS-DE06 >= 0.75; MS-DE07 >= 0.75; MS-DE09 >= 0.75; MS-DE14 >= 0.80; MS-DE15 >= 0.80 |
| C-DE-S-MODEL | MS-DE01 >= 0.90; MS-DE03 >= 0.90; MS-DE06 >= 0.90; MS-DE13 >= 0.90; MS-DE16 >= 0.90 |
| C-DE-S-PIPE | MS-DE02 >= 0.90; MS-DE04 >= 0.90; MS-DE08 >= 0.90; MS-DE10 >= 0.90; MS-DE11 >= 0.90; MS-DE12 >= 0.90 |
| C-DE-S-QUAL | MS-DE05 >= 0.95; MS-DE06 >= 0.90; MS-DE07 >= 0.90; MS-DE09 >= 0.90; MS-DE14 >= 0.95; MS-DE15 >= 0.95 |
| C-AI-J-DATA | MS-AI01 >= 0.60; MS-AI02 >= 0.65; MS-AI03 >= 0.60; MS-AI09 >= 0.65; MS-AI12 >= 0.60 |
| C-AI-J-MODEL | MS-AI04 >= 0.60; MS-AI05 >= 0.60; MS-AI06 >= 0.65; MS-AI10 >= 0.65; MS-AI11 >= 0.60; MS-AI13 >= 0.60 |
| C-AI-J-OPS | MS-AI07 >= 0.60; MS-AI08 >= 0.60; MS-FS05 >= 0.60; MS-AI14 >= 0.60; MS-AI15 >= 0.65; MS-AI16 >= 0.60 |
| C-AI-M-DATA | MS-AI01 >= 0.75; MS-AI02 >= 0.80; MS-AI03 >= 0.75; MS-AI09 >= 0.80; MS-AI12 >= 0.75 |
| C-AI-M-MODEL | MS-AI04 >= 0.75; MS-AI05 >= 0.75; MS-AI06 >= 0.80; MS-AI10 >= 0.80; MS-AI11 >= 0.75; MS-AI13 >= 0.75 |
| C-AI-M-OPS | MS-AI07 >= 0.75; MS-AI08 >= 0.75; MS-FS05 >= 0.75; MS-AI14 >= 0.75; MS-AI15 >= 0.80; MS-AI16 >= 0.75 |
| C-AI-S-DATA | MS-AI01 >= 0.90; MS-AI02 >= 0.95; MS-AI03 >= 0.90; MS-AI09 >= 0.95; MS-AI12 >= 0.90 |
| C-AI-S-MODEL | MS-AI04 >= 0.90; MS-AI05 >= 0.90; MS-AI06 >= 0.95; MS-AI10 >= 0.95; MS-AI11 >= 0.90; MS-AI13 >= 0.90 |
| C-AI-S-OPS | MS-AI07 >= 0.90; MS-AI08 >= 0.90; MS-FS05 >= 0.90; MS-AI14 >= 0.90; MS-AI15 >= 0.95; MS-AI16 >= 0.90 |
| C-FS-J-UI | MS-FS01 >= 0.60; MS-FS02 >= 0.60; MS-FS09 >= 0.60; MS-FS10 >= 0.60; MS-FS11 >= 0.60 |
| C-FS-J-SERVICE | MS-FS03 >= 0.60; MS-FS04 >= 0.60; MS-FS05 >= 0.60; MS-FS12 >= 0.65; MS-FS13 >= 0.65; MS-FS14 >= 0.65 |
| C-FS-J-QUALITY | MS-FS06 >= 0.60; MS-FS07 >= 0.65; MS-FS08 >= 0.60; MS-FS15 >= 0.60; MS-FS16 >= 0.60 |
| C-FS-M-UI | MS-FS01 >= 0.75; MS-FS02 >= 0.75; MS-FS09 >= 0.75; MS-FS10 >= 0.75; MS-FS11 >= 0.75 |
| C-FS-M-SERVICE | MS-FS03 >= 0.75; MS-FS04 >= 0.75; MS-FS05 >= 0.75; MS-FS12 >= 0.80; MS-FS13 >= 0.80; MS-FS14 >= 0.80 |
| C-FS-M-QUALITY | MS-FS06 >= 0.75; MS-FS07 >= 0.80; MS-FS08 >= 0.75; MS-FS15 >= 0.75; MS-FS16 >= 0.75 |
| C-FS-S-UI | MS-FS01 >= 0.90; MS-FS02 >= 0.90; MS-FS09 >= 0.90; MS-FS10 >= 0.90; MS-FS11 >= 0.90 |
| C-FS-S-SERVICE | MS-FS03 >= 0.90; MS-FS04 >= 0.90; MS-FS05 >= 0.90; MS-FS12 >= 0.95; MS-FS13 >= 0.95; MS-FS14 >= 0.95 |
| C-FS-S-QUALITY | MS-FS06 >= 0.90; MS-FS07 >= 0.95; MS-FS08 >= 0.90; MS-FS15 >= 0.90; MS-FS16 >= 0.90 |
| C-QA-J-DESIGN | MS-QA01 >= 0.60; MS-QA02 >= 0.60; MS-QA08 >= 0.60; MS-QA09 >= 0.65; MS-QA10 >= 0.65; MS-QA11 >= 0.60 |
| C-QA-J-EXEC | MS-QA03 >= 0.65; MS-QA04 >= 0.65; MS-QA05 >= 0.60; MS-QA12 >= 0.60; MS-QA13 >= 0.65; MS-QA14 >= 0.60 |
| C-QA-J-AUTO | MS-QA06 >= 0.60; MS-QA07 >= 0.60; MS-FS07 >= 0.65; MS-QA15 >= 0.60; MS-QA16 >= 0.60 |
| C-QA-M-DESIGN | MS-QA01 >= 0.75; MS-QA02 >= 0.75; MS-QA08 >= 0.75; MS-QA09 >= 0.80; MS-QA10 >= 0.80; MS-QA11 >= 0.75 |
| C-QA-M-EXEC | MS-QA03 >= 0.80; MS-QA04 >= 0.80; MS-QA05 >= 0.75; MS-QA12 >= 0.75; MS-QA13 >= 0.80; MS-QA14 >= 0.75 |
| C-QA-M-AUTO | MS-QA06 >= 0.75; MS-QA07 >= 0.75; MS-FS07 >= 0.80; MS-QA15 >= 0.75; MS-QA16 >= 0.75 |
| C-QA-S-DESIGN | MS-QA01 >= 0.90; MS-QA02 >= 0.90; MS-QA08 >= 0.90; MS-QA09 >= 0.95; MS-QA10 >= 0.95; MS-QA11 >= 0.90 |
| C-QA-S-EXEC | MS-QA03 >= 0.95; MS-QA04 >= 0.95; MS-QA05 >= 0.90; MS-QA12 >= 0.90; MS-QA13 >= 0.95; MS-QA14 >= 0.90 |
| C-QA-S-AUTO | MS-QA06 >= 0.90; MS-QA07 >= 0.90; MS-FS07 >= 0.95; MS-QA15 >= 0.90; MS-QA16 >= 0.90 |

## Module content references

| Module ID | contentUri | Type | Version |
|---|---|---|---|
| MOD-DE-J-MODEL-01 | [content/modules/MOD-DE-J-MODEL-01.md](content/modules/MOD-DE-J-MODEL-01.md) | text/markdown | 1.0 |
| MOD-DE-J-MODEL-02 | [content/modules/MOD-DE-J-MODEL-02.md](content/modules/MOD-DE-J-MODEL-02.md) | text/markdown | 1.0 |
| MOD-DE-J-PIPE-01 | [content/modules/MOD-DE-J-PIPE-01.md](content/modules/MOD-DE-J-PIPE-01.md) | text/markdown | 1.0 |
| MOD-DE-J-PIPE-02 | [content/modules/MOD-DE-J-PIPE-02.md](content/modules/MOD-DE-J-PIPE-02.md) | text/markdown | 1.0 |
| MOD-DE-J-QUAL-01 | [content/modules/MOD-DE-J-QUAL-01.md](content/modules/MOD-DE-J-QUAL-01.md) | text/markdown | 1.0 |
| MOD-DE-J-QUAL-02 | [content/modules/MOD-DE-J-QUAL-02.md](content/modules/MOD-DE-J-QUAL-02.md) | text/markdown | 1.0 |
| MOD-DE-M-MODEL-01 | [content/modules/MOD-DE-M-MODEL-01.md](content/modules/MOD-DE-M-MODEL-01.md) | text/markdown | 1.0 |
| MOD-DE-M-MODEL-02 | [content/modules/MOD-DE-M-MODEL-02.md](content/modules/MOD-DE-M-MODEL-02.md) | text/markdown | 1.0 |
| MOD-DE-M-PIPE-01 | [content/modules/MOD-DE-M-PIPE-01.md](content/modules/MOD-DE-M-PIPE-01.md) | text/markdown | 1.0 |
| MOD-DE-M-PIPE-02 | [content/modules/MOD-DE-M-PIPE-02.md](content/modules/MOD-DE-M-PIPE-02.md) | text/markdown | 1.0 |
| MOD-DE-M-QUAL-01 | [content/modules/MOD-DE-M-QUAL-01.md](content/modules/MOD-DE-M-QUAL-01.md) | text/markdown | 1.0 |
| MOD-DE-M-QUAL-02 | [content/modules/MOD-DE-M-QUAL-02.md](content/modules/MOD-DE-M-QUAL-02.md) | text/markdown | 1.0 |
| MOD-DE-S-MODEL-01 | [content/modules/MOD-DE-S-MODEL-01.md](content/modules/MOD-DE-S-MODEL-01.md) | text/markdown | 1.0 |
| MOD-DE-S-MODEL-02 | [content/modules/MOD-DE-S-MODEL-02.md](content/modules/MOD-DE-S-MODEL-02.md) | text/markdown | 1.0 |
| MOD-DE-S-PIPE-01 | [content/modules/MOD-DE-S-PIPE-01.md](content/modules/MOD-DE-S-PIPE-01.md) | text/markdown | 1.0 |
| MOD-DE-S-PIPE-02 | [content/modules/MOD-DE-S-PIPE-02.md](content/modules/MOD-DE-S-PIPE-02.md) | text/markdown | 1.0 |
| MOD-DE-S-QUAL-01 | [content/modules/MOD-DE-S-QUAL-01.md](content/modules/MOD-DE-S-QUAL-01.md) | text/markdown | 1.0 |
| MOD-DE-S-QUAL-02 | [content/modules/MOD-DE-S-QUAL-02.md](content/modules/MOD-DE-S-QUAL-02.md) | text/markdown | 1.0 |
| MOD-AI-J-DATA-01 | [content/modules/MOD-AI-J-DATA-01.md](content/modules/MOD-AI-J-DATA-01.md) | text/markdown | 1.0 |
| MOD-AI-J-DATA-02 | [content/modules/MOD-AI-J-DATA-02.md](content/modules/MOD-AI-J-DATA-02.md) | text/markdown | 1.0 |
| MOD-AI-J-MODEL-01 | [content/modules/MOD-AI-J-MODEL-01.md](content/modules/MOD-AI-J-MODEL-01.md) | text/markdown | 1.0 |
| MOD-AI-J-MODEL-02 | [content/modules/MOD-AI-J-MODEL-02.md](content/modules/MOD-AI-J-MODEL-02.md) | text/markdown | 1.0 |
| MOD-AI-J-OPS-01 | [content/modules/MOD-AI-J-OPS-01.md](content/modules/MOD-AI-J-OPS-01.md) | text/markdown | 1.0 |
| MOD-AI-J-OPS-02 | [content/modules/MOD-AI-J-OPS-02.md](content/modules/MOD-AI-J-OPS-02.md) | text/markdown | 1.0 |
| MOD-AI-M-DATA-01 | [content/modules/MOD-AI-M-DATA-01.md](content/modules/MOD-AI-M-DATA-01.md) | text/markdown | 1.0 |
| MOD-AI-M-DATA-02 | [content/modules/MOD-AI-M-DATA-02.md](content/modules/MOD-AI-M-DATA-02.md) | text/markdown | 1.0 |
| MOD-AI-M-MODEL-01 | [content/modules/MOD-AI-M-MODEL-01.md](content/modules/MOD-AI-M-MODEL-01.md) | text/markdown | 1.0 |
| MOD-AI-M-MODEL-02 | [content/modules/MOD-AI-M-MODEL-02.md](content/modules/MOD-AI-M-MODEL-02.md) | text/markdown | 1.0 |
| MOD-AI-M-OPS-01 | [content/modules/MOD-AI-M-OPS-01.md](content/modules/MOD-AI-M-OPS-01.md) | text/markdown | 1.0 |
| MOD-AI-M-OPS-02 | [content/modules/MOD-AI-M-OPS-02.md](content/modules/MOD-AI-M-OPS-02.md) | text/markdown | 1.0 |
| MOD-AI-S-DATA-01 | [content/modules/MOD-AI-S-DATA-01.md](content/modules/MOD-AI-S-DATA-01.md) | text/markdown | 1.0 |
| MOD-AI-S-DATA-02 | [content/modules/MOD-AI-S-DATA-02.md](content/modules/MOD-AI-S-DATA-02.md) | text/markdown | 1.0 |
| MOD-AI-S-MODEL-01 | [content/modules/MOD-AI-S-MODEL-01.md](content/modules/MOD-AI-S-MODEL-01.md) | text/markdown | 1.0 |
| MOD-AI-S-MODEL-02 | [content/modules/MOD-AI-S-MODEL-02.md](content/modules/MOD-AI-S-MODEL-02.md) | text/markdown | 1.0 |
| MOD-AI-S-OPS-01 | [content/modules/MOD-AI-S-OPS-01.md](content/modules/MOD-AI-S-OPS-01.md) | text/markdown | 1.0 |
| MOD-AI-S-OPS-02 | [content/modules/MOD-AI-S-OPS-02.md](content/modules/MOD-AI-S-OPS-02.md) | text/markdown | 1.0 |
| MOD-FS-J-UI-01 | [content/modules/MOD-FS-J-UI-01.md](content/modules/MOD-FS-J-UI-01.md) | text/markdown | 1.0 |
| MOD-FS-J-UI-02 | [content/modules/MOD-FS-J-UI-02.md](content/modules/MOD-FS-J-UI-02.md) | text/markdown | 1.0 |
| MOD-FS-J-SERVICE-01 | [content/modules/MOD-FS-J-SERVICE-01.md](content/modules/MOD-FS-J-SERVICE-01.md) | text/markdown | 1.0 |
| MOD-FS-J-SERVICE-02 | [content/modules/MOD-FS-J-SERVICE-02.md](content/modules/MOD-FS-J-SERVICE-02.md) | text/markdown | 1.0 |
| MOD-FS-J-QUALITY-01 | [content/modules/MOD-FS-J-QUALITY-01.md](content/modules/MOD-FS-J-QUALITY-01.md) | text/markdown | 1.0 |
| MOD-FS-J-QUALITY-02 | [content/modules/MOD-FS-J-QUALITY-02.md](content/modules/MOD-FS-J-QUALITY-02.md) | text/markdown | 1.0 |
| MOD-FS-M-UI-01 | [content/modules/MOD-FS-M-UI-01.md](content/modules/MOD-FS-M-UI-01.md) | text/markdown | 1.0 |
| MOD-FS-M-UI-02 | [content/modules/MOD-FS-M-UI-02.md](content/modules/MOD-FS-M-UI-02.md) | text/markdown | 1.0 |
| MOD-FS-M-SERVICE-01 | [content/modules/MOD-FS-M-SERVICE-01.md](content/modules/MOD-FS-M-SERVICE-01.md) | text/markdown | 1.0 |
| MOD-FS-M-SERVICE-02 | [content/modules/MOD-FS-M-SERVICE-02.md](content/modules/MOD-FS-M-SERVICE-02.md) | text/markdown | 1.0 |
| MOD-FS-M-QUALITY-01 | [content/modules/MOD-FS-M-QUALITY-01.md](content/modules/MOD-FS-M-QUALITY-01.md) | text/markdown | 1.0 |
| MOD-FS-M-QUALITY-02 | [content/modules/MOD-FS-M-QUALITY-02.md](content/modules/MOD-FS-M-QUALITY-02.md) | text/markdown | 1.0 |
| MOD-FS-S-UI-01 | [content/modules/MOD-FS-S-UI-01.md](content/modules/MOD-FS-S-UI-01.md) | text/markdown | 1.0 |
| MOD-FS-S-UI-02 | [content/modules/MOD-FS-S-UI-02.md](content/modules/MOD-FS-S-UI-02.md) | text/markdown | 1.0 |
| MOD-FS-S-SERVICE-01 | [content/modules/MOD-FS-S-SERVICE-01.md](content/modules/MOD-FS-S-SERVICE-01.md) | text/markdown | 1.0 |
| MOD-FS-S-SERVICE-02 | [content/modules/MOD-FS-S-SERVICE-02.md](content/modules/MOD-FS-S-SERVICE-02.md) | text/markdown | 1.0 |
| MOD-FS-S-QUALITY-01 | [content/modules/MOD-FS-S-QUALITY-01.md](content/modules/MOD-FS-S-QUALITY-01.md) | text/markdown | 1.0 |
| MOD-FS-S-QUALITY-02 | [content/modules/MOD-FS-S-QUALITY-02.md](content/modules/MOD-FS-S-QUALITY-02.md) | text/markdown | 1.0 |
| MOD-QA-J-DESIGN-01 | [content/modules/MOD-QA-J-DESIGN-01.md](content/modules/MOD-QA-J-DESIGN-01.md) | text/markdown | 1.0 |
| MOD-QA-J-DESIGN-02 | [content/modules/MOD-QA-J-DESIGN-02.md](content/modules/MOD-QA-J-DESIGN-02.md) | text/markdown | 1.0 |
| MOD-QA-J-EXEC-01 | [content/modules/MOD-QA-J-EXEC-01.md](content/modules/MOD-QA-J-EXEC-01.md) | text/markdown | 1.0 |
| MOD-QA-J-EXEC-02 | [content/modules/MOD-QA-J-EXEC-02.md](content/modules/MOD-QA-J-EXEC-02.md) | text/markdown | 1.0 |
| MOD-QA-J-AUTO-01 | [content/modules/MOD-QA-J-AUTO-01.md](content/modules/MOD-QA-J-AUTO-01.md) | text/markdown | 1.0 |
| MOD-QA-J-AUTO-02 | [content/modules/MOD-QA-J-AUTO-02.md](content/modules/MOD-QA-J-AUTO-02.md) | text/markdown | 1.0 |
| MOD-QA-M-DESIGN-01 | [content/modules/MOD-QA-M-DESIGN-01.md](content/modules/MOD-QA-M-DESIGN-01.md) | text/markdown | 1.0 |
| MOD-QA-M-DESIGN-02 | [content/modules/MOD-QA-M-DESIGN-02.md](content/modules/MOD-QA-M-DESIGN-02.md) | text/markdown | 1.0 |
| MOD-QA-M-EXEC-01 | [content/modules/MOD-QA-M-EXEC-01.md](content/modules/MOD-QA-M-EXEC-01.md) | text/markdown | 1.0 |
| MOD-QA-M-EXEC-02 | [content/modules/MOD-QA-M-EXEC-02.md](content/modules/MOD-QA-M-EXEC-02.md) | text/markdown | 1.0 |
| MOD-QA-M-AUTO-01 | [content/modules/MOD-QA-M-AUTO-01.md](content/modules/MOD-QA-M-AUTO-01.md) | text/markdown | 1.0 |
| MOD-QA-M-AUTO-02 | [content/modules/MOD-QA-M-AUTO-02.md](content/modules/MOD-QA-M-AUTO-02.md) | text/markdown | 1.0 |
| MOD-QA-S-DESIGN-01 | [content/modules/MOD-QA-S-DESIGN-01.md](content/modules/MOD-QA-S-DESIGN-01.md) | text/markdown | 1.0 |
| MOD-QA-S-DESIGN-02 | [content/modules/MOD-QA-S-DESIGN-02.md](content/modules/MOD-QA-S-DESIGN-02.md) | text/markdown | 1.0 |
| MOD-QA-S-EXEC-01 | [content/modules/MOD-QA-S-EXEC-01.md](content/modules/MOD-QA-S-EXEC-01.md) | text/markdown | 1.0 |
| MOD-QA-S-EXEC-02 | [content/modules/MOD-QA-S-EXEC-02.md](content/modules/MOD-QA-S-EXEC-02.md) | text/markdown | 1.0 |
| MOD-QA-S-AUTO-01 | [content/modules/MOD-QA-S-AUTO-01.md](content/modules/MOD-QA-S-AUTO-01.md) | text/markdown | 1.0 |
| MOD-QA-S-AUTO-02 | [content/modules/MOD-QA-S-AUTO-02.md](content/modules/MOD-QA-S-AUTO-02.md) | text/markdown | 1.0 |

## Prerequisite evidence

All edges below are internally synthesized LEARNING_READINESS proposals with NEEDS_EXPERT_REVIEW. Source support does not imply that the publisher defines this exact prerequisite or that it is universally necessary.

| Edge ID | Dependent skill | Foundation skill | Rationale | Supporting official resource |
|---|---|---|---|---|
| REL-PR-001 | MS-DE03 | MS-DE01 | Represent keys, relationships and record grain before implementing warehouse structures. | [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html) |
| REL-PR-002 | MS-DE13 | MS-DE03 | Establish a working warehouse before measuring changes to its workloads. | [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html) |
| REL-PR-003 | MS-DE15 | MS-DE02 | Understand the transformation input/output behaviour before testing a data pipeline. | [pytest getting started](https://docs.pytest.org/en/stable/getting-started.html) |
| REL-PR-004 | MS-AI02 | MS-AI01 | Identify modelling records and targets before defining preprocessing boundaries. | [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) |
| REL-PR-005 | MS-AI03 | MS-AI02 | Preserve training/evaluation separation while constructing learned features. | [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) |
| REL-PR-006 | MS-AI05 | MS-AI01 | Prepare identified inputs and target labels before training a predictor. | [scikit-learn getting started](https://scikit-learn.org/stable/getting_started.html) |
| REL-PR-007 | MS-AI06 | MS-AI05 | Produce predictions from a fitted baseline before judging predictive error. | [scikit-learn getting started](https://scikit-learn.org/stable/getting_started.html) |
| REL-PR-008 | MS-AI10 | MS-AI09 | Choose a valid partition strategy before running folds. | [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html) |
| REL-PR-009 | MS-AI11 | MS-AI10 | Use a valid cross-validation procedure for the parameter-search pathway selected here. | [scikit-learn parameter search](https://scikit-learn.org/stable/modules/grid_search.html) |
| REL-PR-010 | MS-AI07 | MS-AI05 | Have a fitted artifact before packaging and reloading a model. | [scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html) |
| REL-PR-011 | MS-AI08 | MS-AI07 | Understand the deployed model and runtime before monitoring its live behaviour. | [scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html) |
| REL-PR-012 | MS-AI15 | MS-AI07 | Expose a model interface before checking its integration contract. | [scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html) |
| REL-PR-013 | MS-FS09 | MS-FS01 | Identify the intended interface structure before adapting its layout. | [MDN responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) |
| REL-PR-014 | MS-FS05 | MS-FS03 | Understand the component contract before connecting components. | [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) |
| REL-PR-015 | MS-FS14 | MS-FS04 | Understand data-changing operations before grouping them in a transaction. | [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html) |
| REL-PR-016 | MS-FS16 | MS-FS07 | Provide a meaningful automated check before wiring the test stage of this CI pathway. | [GitHub Actions introduction](https://docs.github.com/en/actions/get-started/understand-github-actions) |
| REL-PR-017 | MS-QA06 | MS-QA02 | Specify expected test cases before automating their execution. | [Playwright writing tests](https://playwright.dev/docs/writing-tests) |
| REL-PR-018 | MS-QA10 | MS-QA09 | Identify ordered input partitions before testing their boundaries. | [ISTQB CTFL 4.0.1 syllabus](https://istqb.org/?download_id=3345&sdm_process_download=1) |
| REL-PR-019 | MS-QA14 | MS-QA03 | Execute and record a test reliably before interpreting repeat runs after a change. | [ISTQB CTFL 4.0.1 syllabus](https://istqb.org/?download_id=3345&sdm_process_download=1) |
| REL-PR-020 | MS-QA16 | MS-QA06 | Understand automated setup and assertions before diagnosing flaky outcomes. | [Playwright retries](https://playwright.dev/docs/test-retries) |

## Learning resource register

- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Airflow workflow tutorial](https://airflow.apache.org/docs/apache-airflow/stable/tutorial/fundamentals.html)
- [scikit-learn getting started](https://scikit-learn.org/stable/getting_started.html)
- [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html)
- [scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html)
- [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [scikit-learn parameter search](https://scikit-learn.org/stable/modules/grid_search.html)
- [MDN accessible HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [MDN responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [pytest getting started](https://docs.pytest.org/en/stable/getting-started.html)
- [GitHub Actions introduction](https://docs.github.com/en/actions/get-started/understand-github-actions)
- [ISTQB CTFL 4.0.1 syllabus](https://istqb.org/?download_id=3345&sdm_process_download=1)
- [Playwright writing tests](https://playwright.dev/docs/writing-tests)
- [Playwright retries](https://playwright.dev/docs/test-retries)

Reviewed 12 October 2026. Linked external resources are not bundled copies. All local teaching examples are illustrative and authored for this curriculum.

## Source boundary and locally authored content

The evidence tables below retain the 64 skill mappings from v0.3. Skill names and definitions were checked against the supplied workbook before reuse. These citations support concept identity or the basis for deriving a skill. They do not establish the validity of local task difficulty, course design, mandatory status or numerical cut-offs.

All 36 competency groupings, 36 course descriptions, 72 module task/evidence specifications and 201 contextual requirement tasks are local authored synthesis. Their chain of evidence is requirement → MicroSkill ID → cited skill mapping below. SourceConceptUri, sourceLocator, sourceVerification and derivation metadata are maintained only here, not in database seed records.

## Skill catalogue and evidence

`sourceConceptUri` is present only for reused concepts. A blank URI means a local derived outcome, not a missing invented URI. `sourceVerification = SOURCE_REVIEWED` means that the cited content was inspected, not that a standards body endorsed the local mapping. Existing ESCO concepts retain their verified v1.2.1 API snapshots in [the evidence manifest](sources/ontology_2026_10_12/manifest.json). New technical references were reviewed on 12 October 2026.

### DE: 16 catalogued skills

| ID | English skill name | Local definition | Derivation | Evidence and sourceLocator |
|---|---|---|---|---|
| MS-DE01 | create data models | Represent entities, relationships and constraints in a data model. | REUSED_CONCEPT | [E-DE01][E-DE01] — Concept description |
| MS-DE02 | develop data processing applications | Implement programs that transform input data into specified outputs. | REUSED_CONCEPT | [E-DE02][E-DE02] — Concept description |
| MS-DE03 | implement data warehousing techniques | Apply warehouse structures and loading techniques to analytical data. | REUSED_CONCEPT | [E-DE03][E-DE03] — Concept description |
| MS-DE04 | Document source-to-target mappings | Record how source fields become target fields, including transformation rules. | DERIVED_OUTCOME | [ON-DE][ON-DE], [UK-DE][UK-DE] — Data engineer responsibilities |
| MS-DE05 | Verify data quality | Check records against explicit completeness, accuracy and consistency rules. | DERIVED_OUTCOME | [ON-DE][ON-DE] — Tasks: Verify the structure, accuracy, or quality of warehouse data |
| MS-DE06 | Maintain metadata documentation | Record dataset meaning, ownership and structural metadata. | DERIVED_OUTCOME | [ON-DE][ON-DE], [UK-DE][UK-DE] — Metadata management |
| MS-DE07 | Monitor pipeline operations | Observe pipeline runs and investigate operational failures. | DERIVED_OUTCOME | [SF-DENG][SF-DENG] — DENG Levels 2, 4, 5: monitoring operations/performance |
| MS-DE08 | Design data integration flows | Specify how data moves between source and destination systems. | DERIVED_OUTCOME | [UK-DE][UK-DE] — Data integration design: Working/Practitioner |
| MS-DE09 | Profile source datasets | Summarise missing values, duplicates and distributions before ingestion. | DERIVED_OUTCOME | [UK-DE][UK-DE] — Data analysis and synthesis: data profiling and source system analysis |
| MS-DE10 | Implement data extraction | Extract source records into a controlled staging area. | DERIVED_OUTCOME | [ON-DE][ON-DE] — Tasks: extraction procedures from operational systems |
| MS-DE11 | Implement transformation rules | Convert values and enforce business rules during data processing. | DERIVED_OUTCOME | [ON-DE][ON-DE] — Tasks: business rules and warehouse transformation processes |
| MS-DE12 | Orchestrate retry-safe pipeline tasks | Order dependent tasks and make retries preserve correct outputs. | DERIVED_OUTCOME | [T-AIR][T-AIR] — Creating a task; repeatable results during retries |
| MS-DE13 | Optimise warehouse workloads | Compare access speed and loading cost before selecting a warehouse optimisation. | DERIVED_OUTCOME | [ON-DE][ON-DE] — Tasks: balance data access, batch loading and resource use |
| MS-DE14 | Apply secure data handling | Apply access restrictions and approved handling controls to datasets. | DERIVED_OUTCOME | [UK-DE][UK-DE] — Data compliance and security; data integration design |
| MS-DE15 | Test data pipelines | Write checks for transformation logic and end-to-end data flow. | DERIVED_OUTCOME | [ON-DE][ON-DE] — Tasks: warehouse test files, unit and integration tests |
| MS-DE16 | Trace data dependencies | Identify downstream consumers affected by a dataset change. | DERIVED_OUTCOME | [UK-DE][UK-DE] — Metadata management: integration impact analysis |

### AI: 16 catalogued skills

| ID | English skill name | Local definition | Derivation | Evidence and sourceLocator |
|---|---|---|---|---|
| MS-AI01 | create data sets | Assemble a dataset suitable for a stated modelling task. | REUSED_CONCEPT | [E-AI01][E-AI01] — Concept description |
| MS-AI02 | Prepare leakage-safe training data | Fit preprocessing on training data without leaking evaluation information. | DERIVED_OUTCOME | [T-ML-PREP][T-ML-PREP] — Data leakage |
| MS-AI03 | Construct and select model features | Build or select input features relevant to the prediction task. | DERIVED_OUTCOME | [T-ML-PREP][T-ML-PREP], [ON-AI][ON-AI] — Tasks: feature selection |
| MS-AI04 | utilise machine learning | Apply a suitable machine learning method to a defined problem. | REUSED_CONCEPT | [E-AI04][E-AI04] — Concept description |
| MS-AI05 | build predictive models | Train a predictive model from an identified dataset. | REUSED_CONCEPT | [E-AI05][E-AI05] — Concept description |
| MS-AI06 | Evaluate predictive models | Compare predictions with reference outcomes using appropriate metrics. | DERIVED_OUTCOME | [T-ML-EVAL][T-ML-EVAL], [ON-AI][ON-AI] — Tasks: compare/validate models |
| MS-AI07 | Package and deploy a model | Save, load and expose a model in a reproducible runtime. | DERIVED_OUTCOME | [T-ML-SAVE][T-ML-SAVE], [UK-AI][UK-AI] — Senior ML engineer: deploy models into production |
| MS-AI08 | Monitor deployed model performance | Track deployed model quality and operational behaviour. | DERIVED_OUTCOME | [UK-AI][UK-AI], [SF-MLNG][SF-MLNG] — MLNG Level 3 |
| MS-AI09 | Select data split strategies | Choose random, stratified, grouped or temporal splits to match the data. | DERIVED_OUTCOME | [T-CV][T-CV] — Cross-validation iterators for different data assumptions |
| MS-AI10 | Run cross-validation | Evaluate a training procedure across valid folds without contaminating the final test set. | DERIVED_OUTCOME | [T-CV][T-CV] — Computing cross-validated metrics |
| MS-AI11 | Tune model hyperparameters | Search candidate settings using validation evidence and a bounded budget. | DERIVED_OUTCOME | [T-TUNE][T-TUNE] — Grid search and randomized parameter optimization |
| MS-AI12 | Assess class imbalance | Inspect class frequencies and choose evaluation measures that reveal minority-class errors. | DERIVED_OUTCOME | [T-ML-EVAL][T-ML-EVAL] — Balanced accuracy; precision, recall and F-measures |
| MS-AI13 | Analyse model errors | Inspect confusion patterns or residuals to explain model weaknesses. | DERIVED_OUTCOME | [T-ML-EVAL][T-ML-EVAL] — Confusion matrix and regression metrics |
| MS-AI14 | Reproduce ML experiments | Record split seeds, parameters and environment assumptions for repeatable runs. | DERIVED_OUTCOME | [T-ML-PREP][T-ML-PREP] — Controlling randomness and common pitfalls |
| MS-AI15 | Test model service integration | Verify prediction input/output contracts within the consuming system. | DERIVED_OUTCOME | [UK-AI][UK-AI] — Systems integration; production deployment and assurance |
| MS-AI16 | Plan model maintenance | Define retraining and revalidation steps when deployed performance deteriorates. | DERIVED_OUTCOME | [UK-AI][UK-AI] — Senior ML engineer: retrain, maintain and check live models |

### FS: 16 catalogued skills

| ID | English skill name | Local definition | Derivation | Evidence and sourceLocator |
|---|---|---|---|---|
| MS-FS01 | design user interface | Specify user interface structure and interactions for a user task. | REUSED_CONCEPT | [E-FS01][E-FS01] — Concept description |
| MS-FS02 | Implement accessible user interfaces | Implement interfaces that support keyboard and assistive technology use. | DERIVED_OUTCOME | [UK-FE][UK-FE] — Accessibility: Working/Practitioner |
| MS-FS03 | design application interfaces | Define interfaces through which application components exchange information. | REUSED_CONCEPT | [E-FS03][E-FS03] — Concept description |
| MS-FS04 | use query languages | Retrieve and manipulate data using a query language. | REUSED_CONCEPT | [E-FS04][E-FS04] — Concept description |
| MS-FS05 | integrate system components | Connect components and verify their combined behaviour. | REUSED_CONCEPT | [E-FS05][E-FS05] — Concept description |
| MS-FS06 | debug software | Locate and correct causes of software defects. | REUSED_CONCEPT | [E-FS06][E-FS06] — Concept description |
| MS-FS07 | perform software unit testing | Verify individual units of software with repeatable automated checks. | REUSED_CONCEPT | [E-FS07][E-FS07] — Concept description |
| MS-FS08 | conduct ICT code review | Review source changes and give actionable technical feedback. | REUSED_CONCEPT | [E-FS08][E-FS08] — Concept description |
| MS-FS09 | Implement responsive layouts | Adapt layout and content to different viewport sizes. | DERIVED_OUTCOME | [T-RESP][T-RESP] — Flexible layouts and media queries |
| MS-FS10 | Use semantic HTML | Choose elements whose meaning matches the content and interaction. | DERIVED_OUTCOME | [T-SEM][T-SEM] — Semantics in HTML |
| MS-FS11 | Handle asynchronous web requests | Handle successful responses, HTTP failures and request cancellation in the interface. | DERIVED_OUTCOME | [T-FETCH][T-FETCH] — Handling the response; cancelling a request |
| MS-FS12 | Validate application inputs | Enforce input constraints and provide usable validation feedback on client and server. | DERIVED_OUTCOME | [T-VALID][T-VALID] — Client-side validation does not replace server-side validation |
| MS-FS13 | Enforce application authorization | Check permissions for protected actions and resources. | DERIVED_OUTCOME | [T-AUTH][T-AUTH] — Validate permissions on every request; deny by default |
| MS-FS14 | Use database transactions | Commit related updates atomically and roll back unsuccessful operations. | DERIVED_OUTCOME | [T-TX][T-TX] — Transaction blocks and rollback |
| MS-FS15 | Improve existing software structure | Revise existing implementation while checking that required behaviour is preserved. | DERIVED_OUTCOME | [ON-FS][ON-FS] — Tasks: modify existing software and validate changes |
| MS-FS16 | Configure continuous integration | Run build and test steps automatically when code changes. | DERIVED_OUTCOME | [T-CI][T-CI] — Workflows, jobs, steps and event triggers |

### QA: 16 catalogued skills

| ID | English skill name | Local definition | Derivation | Evidence and sourceLocator |
|---|---|---|---|---|
| MS-QA01 | plan software testing | Set test scope, approach, resources and completion conditions. | REUSED_CONCEPT | [E-QA01][E-QA01] — Concept description |
| MS-QA02 | develop ICT test suite | Organise test cases into a suite linked to intended behaviours. | REUSED_CONCEPT | [E-QA02][E-QA02] — Concept description |
| MS-QA03 | execute software tests | Run specified tests and record observed results. | REUSED_CONCEPT | [E-QA03][E-QA03] — Concept description |
| MS-QA04 | report test findings | Communicate test results and defects with supporting evidence. | REUSED_CONCEPT | [E-QA04][E-QA04] — Concept description |
| MS-QA05 | replicate customer software issues | Reproduce a reported issue under identified conditions. | REUSED_CONCEPT | [E-QA05][E-QA05] — Concept description |
| MS-QA06 | develop automated software tests | Implement repeatable automated tests with meaningful assertions. | REUSED_CONCEPT | [E-QA06][E-QA06] — Concept description |
| MS-QA07 | execute integration testing | Test interactions and data exchange between components. | REUSED_CONCEPT | [E-QA07][E-QA07] — Concept description |
| MS-QA08 | Perform structured exploratory testing | Investigate software using a defined exploratory testing charter. | DERIVED_OUTCOME | [SF-TEST][SF-TEST] — TEST Level 3: structured exploratory testing |
| MS-QA09 | Apply equivalence partitioning | Select representative cases from distinct valid and invalid input classes. | DERIVED_OUTCOME | [T-CTFL][T-CTFL] — 4.2.1 Equivalence Partitioning, page 39 |
| MS-QA10 | Apply boundary value analysis | Test values at and around the boundaries of ordered input classes. | DERIVED_OUTCOME | [T-CTFL][T-CTFL] — 4.2.2 Boundary Value Analysis, page 40 |
| MS-QA11 | Prioritise tests by risk | Order tests using failure likelihood and product impact. | DERIVED_OUTCOME | [T-CTFL][T-CTFL] — 5.1.5 Test Case Prioritization; 5.2 Risk Management |
| MS-QA12 | Prepare test data and environments | Set up controlled inputs and system conditions required for repeatable tests. | DERIVED_OUTCOME | [T-CTFL][T-CTFL] — 1.4.1 Test Activities and Tasks: test implementation |
| MS-QA13 | Classify defect impact | Describe defect severity and propose a repair priority with evidence. | DERIVED_OUTCOME | [T-CTFL][T-CTFL] — 5.5 Defect Management: severity and priority |
| MS-QA14 | Run regression tests | Check that changes have not broken previously working behaviour. | DERIVED_OUTCOME | [ON-QA][ON-QA] — Tasks: regression testing and testing system modifications |
| MS-QA15 | Execute performance tests | Measure response behaviour under a defined workload and environment. | DERIVED_OUTCOME | [ON-QA][ON-QA] — Tasks: performance monitoring and production-like test environments |
| MS-QA16 | Investigate flaky automated tests | Use retry results and controlled reruns to diagnose inconsistent test outcomes. | DERIVED_OUTCOME | [T-FLAKY][T-FLAKY] — Retries; flaky classification; worker isolation |

### ESCO concept URIs (documentation only)

| Internal skill ID | sourceConceptUri |
|---|---|
| MS-DE01 | http://data.europa.eu/esco/skill/fbafa41f-cd05-4109-a649-8b44d306d779 |
| MS-DE02 | http://data.europa.eu/esco/skill/f9670490-8aa4-4540-b121-d440a8294aab |
| MS-DE03 | http://data.europa.eu/esco/skill/fd6d2981-3d4a-4ce2-9741-cfc98c5b74bd |
| MS-AI01 | http://data.europa.eu/esco/skill/906323f4-00c4-4c3b-ab5a-8af77be3456e |
| MS-AI04 | http://data.europa.eu/esco/skill/8369c2d6-c100-4cf6-bd83-9668d8678433 |
| MS-AI05 | http://data.europa.eu/esco/skill/38d49d88-9069-467b-b29e-3cae739bdd4d |
| MS-FS01 | http://data.europa.eu/esco/skill/fd33c66c-70c4-40e6-b87c-5495bd3bf26e |
| MS-FS03 | http://data.europa.eu/esco/skill/b0096dc5-2e2d-4bc1-8172-05bf486c3968 |
| MS-FS04 | http://data.europa.eu/esco/skill/75f839c2-fd9a-4ad3-8921-6e734608568d |
| MS-FS05 | http://data.europa.eu/esco/skill/ed8de897-adbe-4f0e-b4d2-534953e64c72 |
| MS-FS06 | http://data.europa.eu/esco/skill/2522a6ce-3202-4ac8-9f5b-b9cb5a3a83a1 |
| MS-FS07 | http://data.europa.eu/esco/skill/7961413f-61d0-4722-9cd9-20a050a29899 |
| MS-FS08 | http://data.europa.eu/esco/skill/9d1b08b3-ba1e-41f6-a466-1ac1e62eb5f0 |
| MS-QA01 | http://data.europa.eu/esco/skill/5d74614d-32c8-4ca4-9818-6980e52424b1 |
| MS-QA02 | http://data.europa.eu/esco/skill/7253d98c-4a6d-4e37-8b6c-accca9f4b639 |
| MS-QA03 | http://data.europa.eu/esco/skill/913e7e83-b8f8-4574-b1ca-1b38f3fd974a |
| MS-QA04 | http://data.europa.eu/esco/skill/561c2525-5bd8-4d86-8f45-820f4be7db93 |
| MS-QA05 | http://data.europa.eu/esco/skill/eb3aa8c1-fb14-47b4-a352-b7975abd2480 |
| MS-QA06 | http://data.europa.eu/esco/skill/6a322874-e32f-4cd8-9683-badce67a7f73 |
| MS-QA07 | http://data.europa.eu/esco/skill/ea412de3-9d7a-4943-8d8c-c6d3c7495d0e |

## Source register

Source evidence is documentation-only. Date for this review: 12 October 2026. ESCO snapshots use v1.2.1; SFIA links target version 9; ISTQB is v4.0.1. Other URLs may change independently of this dataset. Archived API responses and their checksums establish the retained ESCO evidence; the web references are cited pages, not claimed frozen copies.

| Reference | Framework | Location |
|---|---|---|
| [UK-DE][UK-DE] | GOV_UK | Role responsibilities and skill descriptions |
| [UK-AI][UK-AI] | GOV_UK | Role responsibilities and skill descriptions |
| [UK-FS][UK-FS] | GOV_UK | Role responsibilities and skill descriptions |
| [UK-FE][UK-FE] | GOV_UK | Role responsibilities and skill descriptions |
| [UK-QA][UK-QA] | GOV_UK | Role responsibilities and skill descriptions |
| [ON-DE][ON-DE] | ONET | Occupation-specific tasks |
| [ON-AI][ON-AI] | ONET | Occupation-specific tasks |
| [ON-FS][ON-FS] | ONET | Occupation-specific tasks |
| [ON-QA][ON-QA] | ONET | Occupation-specific tasks |
| [SF-DENG][SF-DENG] | SFIA | SFIA 9 skill description and responsibility levels |
| [SF-DTAN][SF-DTAN] | SFIA | SFIA 9 skill description and responsibility levels |
| [SF-MLNG][SF-MLNG] | SFIA | SFIA 9 skill description and responsibility levels |
| [SF-PROG][SF-PROG] | SFIA | SFIA 9 skill description and responsibility levels |
| [SF-SINT][SF-SINT] | SFIA | SFIA 9 skill description and responsibility levels |
| [SF-TEST][SF-TEST] | SFIA | SFIA 9 skill description and responsibility levels |
| [T-ML-PREP][T-ML-PREP] | SCIKIT_LEARN | Preprocessing, leakage and controlling randomness |
| [T-ML-EVAL][T-ML-EVAL] | SCIKIT_LEARN | Prediction metrics and scoring |
| [T-ML-SAVE][T-ML-SAVE] | SCIKIT_LEARN | Model persistence and environment compatibility |
| [F-ESCO][F-ESCO] | ESCO | Framework overview or reference specification |
| [F-ESCO-O][F-ESCO-O] | ESCO | Framework overview or reference specification |
| [F-EXT][F-EXT] | ESCO | Framework overview or reference specification |
| [F-SKOS][F-SKOS] | SKOS | Framework overview or reference specification |
| [F-SFIA][F-SFIA] | SFIA | Framework overview or reference specification |
| [F-ELM][F-ELM] | ELM | Framework overview or reference specification |
| [E-ROLE-DE][E-ROLE-DE] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-ROLE-AI][E-ROLE-AI] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-ROLE-FS][E-ROLE-FS] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-ROLE-QA][E-ROLE-QA] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-DE01][E-DE01] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-DE02][E-DE02] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-DE03][E-DE03] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-AI01][E-AI01] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-AI04][E-AI04] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-AI05][E-AI05] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS01][E-FS01] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS03][E-FS03] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS04][E-FS04] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS05][E-FS05] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS06][E-FS06] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS07][E-FS07] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-FS08][E-FS08] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA01][E-QA01] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA02][E-QA02] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA03][E-QA03] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA04][E-QA04] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA05][E-QA05] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA06][E-QA06] | ESCO | Official ESCO API concept record; English preferred label and description |
| [E-QA07][E-QA07] | ESCO | Official ESCO API concept record; English preferred label and description |
| [T-CV][T-CV] | SCIKIT_LEARN | Cross-validation iterators; stratification; grouped and time series data |
| [T-TUNE][T-TUNE] | SCIKIT_LEARN | Grid search and randomized parameter optimization |
| [T-RESP][T-RESP] | MDN | Media queries and flexible layouts |
| [T-SEM][T-SEM] | MDN | Semantic HTML |
| [T-FETCH][T-FETCH] | MDN | Handling responses and cancelling requests |
| [T-VALID][T-VALID] | MDN | Client-side checks and the need for server-side validation |
| [T-AUTH][T-AUTH] | OWASP | Least privilege; deny by default; validate permissions on every request |
| [T-TX][T-TX] | POSTGRESQL | BEGIN, COMMIT, ROLLBACK and atomic updates |
| [T-CI][T-CI] | GITHUB_DOCS | Workflows, jobs and steps for CI/CD |
| [T-AIR][T-AIR] | APACHE_AIRFLOW | Writing a DAG; creating a task; retries and repeatable task results |
| [T-CTFL][T-CTFL] | ISTQB | Sections 4.2.1, 4.2.2, 5.1.5, 5.2, 5.5 and 1.4.1 |
| [T-FLAKY][T-FLAKY] | PLAYWRIGHT | Failed versus flaky tests; retries and isolated workers |


## Packaging and verification

The handoff ZIP includes the revised workbook, these two Markdown files, ontology_v031_en.json, REVIEW_CHANGES.json, a README the 84 local learning-content files and the retained source-evidence directory. PACKAGE_MANIFEST.json records SHA-256 hashes. The retained ESCO files are API response snapshots. Other technical references are traceable URLs, not claimed frozen copies of the entire websites.

Validation covers counts, ID and endpoint consistency, parent relationships, rubric references, weight sums, score bounds, approval state, course sequence and alignment of required skills with TEACHES. The handoff does not claim that backend publication gates have already been implemented or that expert calibration has happened.

## Presentation wording

“This is our organization's role-centred ontology, informed by documented skill frameworks. Twenty skill concepts retain ESCO identities and forty-four practical outcomes are derived from cited sources. Courses, practice modules, level-specific tasks and score cut-offs are local design decisions. The current release awaits expert approval and may be used for preview, not official attainment.”

[UK-DE]: https://understand-digital-data-roles-skills.service.gov.uk/role/data-engineer/
[UK-AI]: https://understand-digital-data-roles-skills.service.gov.uk/role/machine-learning-engineer/
[UK-FS]: https://understand-digital-data-roles-skills.service.gov.uk/role/software-developer/
[UK-FE]: https://understand-digital-data-roles-skills.service.gov.uk/role/frontend-developer/
[UK-QA]: https://understand-digital-data-roles-skills.service.gov.uk/role/test-engineer/
[ON-DE]: https://www.onetonline.org/link/summary/15-1243.01
[ON-AI]: https://www.onetonline.org/link/summary/15-2051.00
[ON-FS]: https://www.onetonline.org/link/summary/15-1252.00
[ON-QA]: https://www.onetonline.org/link/summary/15-1253.00
[SF-DENG]: https://sfia-online.org/en/sfia-9/skills/data-engineering
[SF-DTAN]: https://sfia-online.org/en/sfia-9/skills/data-modelling-and-design
[SF-MLNG]: https://sfia-online.org/en/sfia-9/skills/machine-learning
[SF-PROG]: https://sfia-online.org/en/sfia-9/skills/programming-software-development
[SF-SINT]: https://sfia-online.org/en/sfia-9/skills/systems-integration-and-build
[SF-TEST]: https://sfia-online.org/en/sfia-9/skills/functional-testing
[T-ML-PREP]: https://scikit-learn.org/stable/common_pitfalls.html
[T-ML-EVAL]: https://scikit-learn.org/stable/modules/model_evaluation.html
[T-ML-SAVE]: https://scikit-learn.org/stable/model_persistence.html
[F-ESCO]: https://esco.ec.europa.eu/en/use-esco
[F-ESCO-O]: https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/occupations-pillar
[F-EXT]: https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/extending-esco
[F-SKOS]: https://www.w3.org/TR/skos-reference/
[F-SFIA]: https://sfia-online.org/en/about-sfia/how-sfia-works
[F-ELM]: https://europa.eu/europass/elm-browser/index.html
[E-ROLE-DE]: https://ec.europa.eu/esco/api/resource/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2F2079755f-d809-49e6-8037-4de6180e54c0&language=en&selectedVersion=v1.2.1
[E-ROLE-AI]: https://ec.europa.eu/esco/api/resource/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2F35553663-deab-4d9a-bf22-15c1625d28e8&language=en&selectedVersion=v1.2.1
[E-ROLE-FS]: https://ec.europa.eu/esco/api/resource/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2Ff2b15a0e-e65a-438a-affb-29b9d50b77d1&language=en&selectedVersion=v1.2.1
[E-ROLE-QA]: https://ec.europa.eu/esco/api/resource/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2F106f79e4-6264-45f1-9e7a-297435cd684b&language=en&selectedVersion=v1.2.1
[E-DE01]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Ffbafa41f-cd05-4109-a649-8b44d306d779&language=en&selectedVersion=v1.2.1
[E-DE02]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Ff9670490-8aa4-4540-b121-d440a8294aab&language=en&selectedVersion=v1.2.1
[E-DE03]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Ffd6d2981-3d4a-4ce2-9741-cfc98c5b74bd&language=en&selectedVersion=v1.2.1
[E-AI01]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F906323f4-00c4-4c3b-ab5a-8af77be3456e&language=en&selectedVersion=v1.2.1
[E-AI04]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F8369c2d6-c100-4cf6-bd83-9668d8678433&language=en&selectedVersion=v1.2.1
[E-AI05]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F38d49d88-9069-467b-b29e-3cae739bdd4d&language=en&selectedVersion=v1.2.1
[E-FS01]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Ffd33c66c-70c4-40e6-b87c-5495bd3bf26e&language=en&selectedVersion=v1.2.1
[E-FS03]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Fb0096dc5-2e2d-4bc1-8172-05bf486c3968&language=en&selectedVersion=v1.2.1
[E-FS04]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F75f839c2-fd9a-4ad3-8921-6e734608568d&language=en&selectedVersion=v1.2.1
[E-FS05]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Fed8de897-adbe-4f0e-b4d2-534953e64c72&language=en&selectedVersion=v1.2.1
[E-FS06]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F2522a6ce-3202-4ac8-9f5b-b9cb5a3a83a1&language=en&selectedVersion=v1.2.1
[E-FS07]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F7961413f-61d0-4722-9cd9-20a050a29899&language=en&selectedVersion=v1.2.1
[E-FS08]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F9d1b08b3-ba1e-41f6-a466-1ac1e62eb5f0&language=en&selectedVersion=v1.2.1
[E-QA01]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F5d74614d-32c8-4ca4-9818-6980e52424b1&language=en&selectedVersion=v1.2.1
[E-QA02]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F7253d98c-4a6d-4e37-8b6c-accca9f4b639&language=en&selectedVersion=v1.2.1
[E-QA03]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F913e7e83-b8f8-4574-b1ca-1b38f3fd974a&language=en&selectedVersion=v1.2.1
[E-QA04]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F561c2525-5bd8-4d86-8f45-820f4be7db93&language=en&selectedVersion=v1.2.1
[E-QA05]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Feb3aa8c1-fb14-47b4-a352-b7975abd2480&language=en&selectedVersion=v1.2.1
[E-QA06]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2F6a322874-e32f-4cd8-9683-badce67a7f73&language=en&selectedVersion=v1.2.1
[E-QA07]: https://ec.europa.eu/esco/api/resource/skill?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Fskill%2Fea412de3-9d7a-4943-8d8c-c6d3c7495d0e&language=en&selectedVersion=v1.2.1
[T-CV]: https://scikit-learn.org/stable/modules/cross_validation.html
[T-TUNE]: https://scikit-learn.org/stable/modules/grid_search.html
[T-RESP]: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
[T-SEM]: https://developer.mozilla.org/en-US/docs/Glossary/Semantics
[T-FETCH]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
[T-VALID]: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation
[T-AUTH]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[T-TX]: https://www.postgresql.org/docs/current/tutorial-transactions.html
[T-CI]: https://docs.github.com/en/actions/get-started/understand-github-actions
[T-AIR]: https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html
[T-CTFL]: https://istqb.org/?download_id=3345&sdm_process_download=1
[T-FLAKY]: https://playwright.dev/docs/test-retries
