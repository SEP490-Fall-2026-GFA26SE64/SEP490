# RQ1 synthetic dataset V9

Run from the repository root: `python3 documents/dataset/generate_rq1_profiles_v9.py`.
The original Downloads files and the V8 generator are preserved.
V9 is standalone and uses only Python's standard library. Its XLSX reader,
catalog validation, domain/role allocation and name generation are included
in this one script; neither older Python file is needed to run it. To move
the generator, keep the ontology workbook beside it or specify `--file`.

## Agreed configuration

- 500 profiles: 200 SE, 150 DATA, 150 AI; balanced target-role quotas per domain.
- 400 typical profiles and 100 challenging profiles, allocated 80/20 per domain.
- Exactly 150 profiles have 2–4 observed skills outside the target domain with mastery >= 0.75. Other profiles have zero such skills. Domain skill membership is the union of active requirements for that domain's roles.
- Unknown values remain null: 20–30% of all skills, observed required coverage 70–100%.
- Every profile has at least one observed required strength and one observed required gap.
- A latent within-domain ability plus per-skill variation replaces fully independent scores. These distributions are simulation assumptions, not calibrated employee measurements.

## Prerequisite assumption

For simulation, an observed advanced skill with mastery >= 0.75 requires each observed direct prerequisite to meet the edge's minMastery. Typical profiles satisfy this rule. Challenging profiles have at least one explicit violation. This threshold is a generator convention, not a claim that prerequisite edges impose numeric mastery ordering.

Null prerequisites remain unresolved and are listed in `unknownPrerequisiteEdges`; typical does not mean every prerequisite is verified. Conflict edges are listed in `prerequisiteConflicts`.

## Gap and sampling

`meanObservedRequiredGap = sum(max(0, targetMastery-currentMastery)) / number of observed required skills`.
Met requirements contribute zero; null values are excluded. Small: [0,0.20), Medium: [0.20,0.40), Large: [0.40,1]. No forced 40/40/20 gap distribution.

The 50-profile sample uses a separate seed (generation seed + 1), contains 20 SE / 15 DATA / 15 AI, covers all 36 roles, and preserves 40 typical / 10 challenging and 15 cross-domain profiles. Remaining selection prioritizes less represented gap bands, then coverage bands (<80%, 80–<90%, >=90%), then type, cross-domain flag and role. Seeded shuffle breaks ties. Bounded retries handle infeasible partial selections.

This is a coverage-oriented benchmark sample. Its gap distribution differs from the 500 profiles. Report results per gap band and domain alongside aggregate Hit Rate@5; the unweighted aggregate does not estimate performance for the 500-profile distribution.

## Outputs

- `rq1_profiles_500_v9.json`: full synthetic population and rule/source metadata.
- `rq1_sample_50_v9.json`: selected profiles with the same competency states and benchmark metadata.
- `rq1_expert_reference_50_template_v9.json`: empty reference labels. Expert independently selects five distinct relevant catalog modules for each profile and records rationale. Annotation has not been performed.

`benchmarkMeta` is for auditing and sampling; recommendation methods should receive target role and competency state without profileType, gapBand or generation labels. Both algorithms must use the same unknown-value policy and candidate eligibility rules. Expert annotation should use readable role requirements, skills, module outcomes and entry requirements, without algorithm rankings or generation labels.

The source workbook SHA-256 and seed are stored in each data file. Changing catalog or rules requires a new dataset version and renewed annotation review.
