# Architecture diagrams

## Verified inventory — 2026-10-23

Current PostgreSQL17.6 inventory is **V1–V26,89 platform tables/729 columns**, captured in a repeatable-read READ ONLY transaction. All26 Flyway source checksums match successful applied history. There are628 constraints/189 FKs (176 parent-child table pairs),213 indexes,99 user triggers and39 functions. [Metadata catalog](postgresql-schema-catalog.json) and [all FK definitions](postgresql-foreign-keys.md) retain exact fields/defaults/checks/indexes/triggers/functions. Public Flyway metadata is outside the89 platform tables.

| Detail group | Owned tables | Source | SVG |
| --- | ---: | --- | --- |
| Identity, catalog and processing | 17 | [source](postgresql.puml) | [image](postgresql.svg) |
| Legacy assessment and shared learning | 32 | [source](postgresql-assessment.puml) | [image](postgresql-assessment.svg) |
| Recommendation, analytics and evaluation | 13 | [source](postgresql-pathway.puml) | [image](postgresql-pathway.svg) |
| Adaptive baseline configuration | 9 | [source](postgresql-adaptive-blueprint.puml) | [image](postgresql-adaptive-blueprint.svg) |
| Adaptive baseline attempts and evidence | 9 | [source](postgresql-adaptive-attempt.puml) | [image](postgresql-adaptive-attempt.svg) |
| IRT calibration and scoped selection | 6 | [source](postgresql-irt.puml) | [image](postgresql-irt.svg) |
| Current Role selection and initial Occupation profile | 3 | [source](postgresql-role-profile.puml) | [image](postgresql-role-profile.svg) |

[Overview source](postgresql-overview.puml) / [SVG](postgresql-overview.svg) lists all89 tables and cross-group FK counts. Every table/column is drawn once in its owning group; external parents are reference stubs. Arrows mean referenced parent → referencing child, not mandatory/one-to-one cardinality or proof of authorization. The V25 selection/profile group is new; V24/V26 are constraint changes visible in the metadata catalog, not new tables.

## Runtime, conceptual and historical views

| View | Source / export | Status |
| --- | --- | --- |
| Development startup | [source](runtime-topology.puml) / [SVG](runtime-topology.svg) | Current observed migration → catalog/content initialization → API; V26 and actual engine versions |
| Role-to-baseline | [source](role-baseline-flow.puml) / [SVG](role-baseline-flow.svg) | Current confirmed business flow; replaces inline Mermaid |
| Adaptive ownership flow | [source](adaptive-baseline-data-flow.puml) / [SVG](adaptive-baseline-data-flow.svg) | Current conceptual store/processing flow; replaces inline Mermaid |
| Ontology | [source](neo4j.puml) / [SVG](neo4j.svg) / [PNG](neo4j.png) | Current0.9.0 field/relationship drawing; many-to-many Module–Skill teaching |
| 20 October adaptive target | [source](postgresql-adaptive-baseline-target.puml) / [SVG](postgresql-adaptive-baseline-target.svg) | Intentionally superseded historical design; unchanged content, not V26 schema |

All13 source/SVG pairs were rendered locally with the existing PlantUML1.2025.10/Smetana JAR. PNG companions for all13 were opened for visual review; no blank/error/clipped table was found. The32-table legacy/shared view is dense and requires zoom. All729 column labels/types/nullability/PK/FK markers are checked structurally against captured metadata; visual readability is not a database/business acceptance test. Ontology PNG matches its regenerated source/SVG. The schema document's duplicate inline ontology drawing now refers to this same canonical export. [Evidence, source hashes and limits](../testing/system/REQ-001-002-final-synchronization-review.md).

## Reproduce

From the product repository with existing PostgreSQL running:

```powershell
python documents/diagrams/Generate-PostgresqlDiagrams.py
python documents/diagrams/Generate-PostgresqlDiagrams.py --snapshot documents/diagrams/postgresql-schema-catalog.json
$sources = Get-ChildItem documents/diagrams -Filter '*.puml' | Where-Object Name -ne 'postgresql-adaptive-baseline-target.puml'
java -jar path/to/plantuml-1.2025.10.jar -failfast2 -tsvg $sources.FullName
```

The generator and PowerShell wrapper do not start containers, migrate, seed or reset data. Unknown/missing/duplicate groups and migration/source drift stop generation. A saved snapshot is dated evidence, not a fresh live verification. Rendering is local; no schema is uploaded to a third-party service. PostgreSQL source capture V23 and all prior artifacts remain recoverable in the synchronization backup; dated evidence is not relabeled.
The ontology source/SVG/PNG now use the matching v0.9.0 exports with many-to-many TEACHES (2026-10-26). Dated V26 metadata/rendering verification above remains historical evidence, not a new live database verification.
