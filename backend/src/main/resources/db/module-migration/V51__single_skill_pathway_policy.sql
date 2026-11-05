-- Permit the new single-Skill policy without rewriting any historical format-2 row/hash.
ALTER TABLE platform.initial_pathway_teaching_v2 ALTER COLUMN teaching_focus DROP NOT NULL;
ALTER TABLE platform.initial_pathway_teaching_v2 ALTER COLUMN difficulty_level DROP NOT NULL;
DO $$ DECLARE c record; BEGIN
    FOR c IN SELECT conname FROM pg_constraint
        WHERE conrelid='platform.initial_pathway_teaching_v2'::regclass AND contype='c'
          AND pg_get_constraintdef(oid) LIKE '%difficulty_fallback_rank IS NOT NULL%'
    LOOP EXECUTE format('ALTER TABLE platform.initial_pathway_teaching_v2 DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE platform.initial_pathway_teaching_v2 ADD CONSTRAINT initial_teaching_policy_shape CHECK (
    (suitability_version='single-skill-v1' AND teaching_focus IS NULL AND difficulty_level IS NULL
        AND preferred_difficulty IS NULL AND NOT expert_attention AND attention_reason IS NULL
        AND ((coverage_role='COVERAGE' AND difficulty_fallback_rank IS NOT NULL AND difficulty_fallback_rank=0)
            OR (coverage_role='ANCILLARY' AND difficulty_fallback_rank IS NULL)))
    OR
    (suitability_version<>'single-skill-v1' AND teaching_focus IS NOT NULL AND difficulty_level IS NOT NULL
        AND ((coverage_role='COVERAGE' AND teaching_focus<>'INCIDENTAL' AND preferred_difficulty IS NOT NULL
            AND difficulty_fallback_rank IS NOT NULL
            AND expert_attention=(teaching_focus='SUPPORTING' OR difficulty_fallback_rank>0))
        OR (coverage_role='ANCILLARY' AND difficulty_fallback_rank IS NULL AND NOT expert_attention)))
);
CREATE UNIQUE INDEX initial_single_skill_module ON platform.initial_pathway_teaching_v2(request_id,revision,module_id)
    WHERE suitability_version='single-skill-v1';
