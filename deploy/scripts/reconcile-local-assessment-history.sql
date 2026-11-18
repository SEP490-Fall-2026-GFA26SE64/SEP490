-- LOCAL legacy assessment history only. Never run against a VPS with V67 demo pricing.
-- Back up first. This preserves SQL checksums and execution records; it does not replay SQL.
BEGIN;
LOCK TABLE public.flyway_schema_history IN EXCLUSIVE MODE;
DO $$
BEGIN
    IF (SELECT count(*) FROM public.flyway_schema_history WHERE success AND (
        (version='67' AND script='V67__independent_skill_assessment_context.sql') OR
        (version='68' AND script='V68__independent_assessment_learner_ownership.sql') OR
        (version='69' AND script='V69__shared_skill_assessment_attempt_scope.sql')
    )) <> 3 OR EXISTS (
        SELECT 1 FROM public.flyway_schema_history WHERE version IN ('71','72','73')
        OR script LIKE '%demo_subscription_prices%'
    ) THEN
        RAISE EXCEPTION 'Unexpected history: aborting; this script is only for the verified legacy local assessment lineage';
    END IF;
    UPDATE public.flyway_schema_history
    SET version=CASE version WHEN '67' THEN '71' WHEN '68' THEN '72' WHEN '69' THEN '73' END,
        script=CASE version
            WHEN '67' THEN 'V71__independent_skill_assessment_context.sql'
            WHEN '68' THEN 'V72__independent_assessment_learner_ownership.sql'
            WHEN '69' THEN 'V73__shared_skill_assessment_attempt_scope.sql' END
    WHERE version IN ('67','68','69');
END $$;
COMMIT;
-- Then run the normal local migrations ONCE with outOfOrder=true to apply the
-- previously absent V67 demo pricing. Restore normal outOfOrder=false afterwards.
