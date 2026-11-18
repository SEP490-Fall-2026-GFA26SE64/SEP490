ALTER TABLE platform.rule_assessment_attempt ALTER COLUMN selection_id DROP NOT NULL;
ALTER TABLE platform.rule_assessment_attempt ADD CONSTRAINT rule_attempt_learning_context CHECK ((
 (selection_id IS NOT NULL AND selection_revision > 0 AND COALESCE(context_snapshot #>> '{context,learningContext}','ROLE_PATHWAY')='ROLE_PATHWAY')
 OR (selection_id IS NULL AND selection_revision=0 AND purpose='SKILL_ASSESSMENT'
     AND context_snapshot #>> '{context,learningContext}'='INDEPENDENT_SKILL'
     AND NULLIF(context_snapshot #>> '{context,moduleId}','') IS NOT NULL
     AND (context_snapshot #>> '{context,moduleRevision}')::integer > 0
     AND NULLIF(context_snapshot #>> '{context,contentVersion}','') IS NOT NULL)
) IS TRUE);
