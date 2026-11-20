-- Diagnostic knowledge satisfaction is separate from official achievement.
CREATE VIEW platform.latest_knowledge_assessment AS
SELECT DISTINCT ON (a.organization_id,a.learner_id,g.skill_id,g.knowledge_level,d->>'skillVersion')
    a.organization_id,a.learner_id,g.skill_id,g.knowledge_level,d->>'skillVersion' AS skill_version,
    a.id AS attempt_id,a.finished_at,g.group_role,
    (r.passed AND (g.group_role<>'MAIN' OR EXISTS (
        SELECT 1 FROM platform.skill_knowledge_evidence e
        WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
            AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level
            AND e.source_id=a.id AND e.requirement_snapshot->>'skillVersion'=d->>'skillVersion'
    ))) AS passed
FROM platform.rule_assessment_attempt a
JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
JOIN platform.rule_assessment_group_result r ON r.attempt_id=g.attempt_id AND r.group_id=g.group_id
JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') d
    ON d->'requirement'->>'skillId'=g.skill_id AND d->'requirement'->>'knowledgeLevel'=g.knowledge_level
WHERE a.state='FINALIZED' AND coalesce(d->>'skillVersion','')<>''
ORDER BY a.organization_id,a.learner_id,g.skill_id,g.knowledge_level,d->>'skillVersion',a.finished_at DESC,a.id DESC;

ALTER TABLE platform.pathway_requirement_step DROP CONSTRAINT pathway_requirement_step_state_check;
ALTER TABLE platform.pathway_requirement_step ADD CONSTRAINT pathway_requirement_step_state_check
    CHECK (state IN ('NEEDS_SUPPLEMENTATION','NEEDS_EXPERT_ACTION','IN_PROGRESS','FULFILLED','ASSESSED_SATISFIED','BYPASSED'));
