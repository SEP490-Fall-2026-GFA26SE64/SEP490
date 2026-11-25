# Expert catalog review and relevance annotation

Version 0.2, 23 November 2026. Audience: reviewers of Application Developer learning requirements and modules at Junior, Middle and Senior. This is a procedure and blank recording structure, not completed expert evidence.

## Purpose and reviewer preparation

Judge whether a learning module is suitable for a synthetic learner's established needs immediately after baseline. Assess suitability described by the synthetic module specification, not the quality of an algorithm or the popularity of a module. The project expects at least two real reviewers with relevant expertise; confirm each reviewer's scope across the three Levels. Software development, AI and IoT expertise are reported, but equal competence in all domains/Levels is not assumed.

Assign pseudonymous reviewer IDs and record actual qualifications/domain, consent to use annotations, conflict/authoring involvement and dates in an appropriately restricted research record. If a reviewer authored the catalog, disclose this and use the second independent reviewer to reduce circularity. Do not fabricate reviewer identities, approvals or dates. No email/message is sent by the assistant under this task.

## Step 1 Review the catalog before labeling profiles

Check that Role/Level requirements are coherent; Skill and knowledge-level identifiers/version mappings are correct; prerequisite direction and knowledge-pair properties are meaningful; synthetic module text clearly specifies its stated objective and scope; and difficulty is not confused with achievement. Inspect descriptions, learning outcomes and included/excluded scope, not only titles or TEACHES links. Full lessons, videos and detailed course syllabi are outside Version 3 research scope. A seed metadata value APPROVED does not establish real pedagogical review when its content still says pending review.

For each issue record object ID/version, issue, severity, proposed correction, actual reviewer and resolution. Missing or ambiguous mandatory specification fields block the corresponding research snapshot; absent full lessons do not. Freeze reviewed content before final profile labeling. The catalog can contain distractor modules irrelevant to a particular learner, provided they are valid available catalog items.

## Step 2 Run a 5–10 profile pilot

Pilot profiles come from development450, not gold50. Present the Role/Level, explicit learning needs, compatible prior achievements, baseline observations and readable module specifications. Hide algorithm name, score, proposed rank and any prefilled answer-key mapping. Randomize presentation with a recorded seed, independently of model rankings; allow consistent search/batching for feasibility.

Each reviewer independently labels the same pilot material. Measure time per profile and per candidate, missing-information frequency, unclear criteria and disagreements. Reviewers may discuss the rubric after their initial independent pass. Record rubric changes; never silently overwrite initial annotations.

Use pilot effort to decide final coverage. Complete-catalog judgment is preferred when feasible. If using a pooled judgment strategy, fix its method, blinding, coverage reporting and metric restrictions before final evaluation. Every output top-five item must be judged for a reported hit/precision comparison. Unknown relevance remains unknown. A pool restricted to Graph outputs is unacceptable. See [RQ1 protocol](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md).

## Step 3 Apply the rubric

| Grade | Meaning | Examples of reasoning |
|---|---|---|
| 2 | Directly suitable for an established current learning need | Content teaches a needed skill at the required knowledge level with appropriate scope; interchangeable valid alternatives may all receive 2 |
| 1 | Useful supporting material, but not a direct response to the current need | Background/context or an adjacent topic; not a substitute for satisfying the requirement |
| 0 | Not suitable for this profile's current needs | Different skill, incompatible level/scope, or material outside the established need |
| Unjudged | Not assessed or insufficient information | Keep grade null and record why; never convert this state to 0 |

A baseline pass is not official achievement, but this initial recommendation task respects the resulting exemption/need state. Do not invent a prerequisite gap because the graph contains a prerequisite edge. If the displayed learning-needs snapshot conflicts with evidence or catalog rules, flag it rather than silently “fixing” the profile. Do not label a module relevant solely because its ID matches a Skill code.

After grading, optionally select up to five preferred modules and rank them 1–5. Fewer than five is allowed. Retain other grade-2 alternatives as acceptable: “outside preferred five” is not synonymous with wrong. Grade 2 defines the primary relevant set; preferredRank is separate metadata.

## Step 4 Independently label and adjudicate gold50

Use the frozen rubric/candidate version. Keep developers blind to final labels until algorithm freeze. Each reviewer submits an independent record; missing fields are returned for clarification, not completed by inference. Compare records only after both independent passes.

For disagreements, retain both grades and reasons, then record the discussed resolution or third-review decision. If unresolved, mark unresolved and document the profile/item's effect on evaluation eligibility. Do not force agreement or publish only the final labels while discarding disagreement evidence.

Report grade distribution, exact agreement, a 3×3 disagreement table and an ordinal agreement statistic such as weighted Cohen's kappa when appropriate for two reviewers. Record weighting and sample count; disagreement is diagnostic, not automatically invalid. Clustered repeated item judgments limit simple independence interpretations. A high agreement score does not prove correct content.

## Blank annotation record

Use [templates/annotation-record.example.json](templates/annotation-record.example.json). Required at collection: protocol/dataset version, real reviewer pseudonym, profile and module/revision IDs, judged status, grade, reason, optional preferred rank and actual timestamp. The supplied null fields are intentionally empty.

Examples must use clearly marked synthetic examples outside the final collection; no example is a completed gold label. Keep rubric practice and final output directories separate.

## Reviewer completion checklist

- Catalog specifications and mappings were inspected within my expertise.
- I saw no algorithm name or ranking during independent judgment.
- I distinguished direct relevance, support and irrelevance.
- I did not treat an unjudged item as irrelevant.
- I recorded legitimate equivalent modules and fewer-than-five cases.
- My identity/date fields reflect actual review, and original decisions are retained.
- Final-set labels were not used to tune the compared algorithms.

Actual label collection is pending. This guide does not claim expert endorsement of the platform.
