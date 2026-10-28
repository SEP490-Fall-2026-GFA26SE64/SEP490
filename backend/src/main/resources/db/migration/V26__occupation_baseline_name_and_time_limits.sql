-- User-confirmed limits22October2026. Legacy format/history retains its original values.
-- V20 was already exercised; extend forward instead of changing the applied compatibility migration.
CREATE OR REPLACE FUNCTION platform.valid_adaptive_blueprint_configuration(config jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE bound jsonb; role_key text;
BEGIN
    IF jsonb_typeof(config) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    IF config ? 'occupationBounds' THEN
        IF NOT config ?& ARRAY['name','occupationBounds']
            OR config - ARRAY['name','occupationBounds'] <> '{}'::jsonb
            OR jsonb_typeof(config -> 'name') IS DISTINCT FROM 'string'
            OR btrim(config ->> 'name') = '' THEN RETURN false; END IF;
        bound := config -> 'occupationBounds';
        IF jsonb_typeof(bound) IS DISTINCT FROM 'object'
            OR NOT bound ?& ARRAY['maxQuestions','timeLimitSeconds']
            OR bound - ARRAY['maxQuestions','timeLimitSeconds'] <> '{}'::jsonb
            OR jsonb_typeof(bound -> 'maxQuestions') IS DISTINCT FROM 'number'
            OR jsonb_typeof(bound -> 'timeLimitSeconds') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
        IF (bound ->> 'maxQuestions') !~ '^[0-9]+$' OR (bound ->> 'timeLimitSeconds') !~ '^[0-9]+$'
            OR (bound ->> 'maxQuestions')::numeric NOT BETWEEN 1 AND 2147483647
            OR (bound ->> 'timeLimitSeconds')::numeric NOT BETWEEN 1 AND 2147483647 THEN RETURN false; END IF;
        IF char_length(btrim(config ->> 'name')) > 100
            OR (bound ->> 'timeLimitSeconds')::numeric < 30 * (bound ->> 'maxQuestions')::numeric
            OR (bound ->> 'timeLimitSeconds')::numeric > 120 * (bound ->> 'maxQuestions')::numeric THEN RETURN false; END IF;
        RETURN true;
    END IF;
    IF jsonb_typeof(config) IS DISTINCT FROM 'object'
        OR NOT config ?& ARRAY['name', 'exploration', 'roles']
        OR config - ARRAY['name', 'exploration', 'roles'] <> '{}'::jsonb
        OR jsonb_typeof(config -> 'name') IS DISTINCT FROM 'string'
        OR btrim(config ->> 'name') = ''
        OR jsonb_typeof(config -> 'roles') IS DISTINCT FROM 'object'
        OR config -> 'roles' = '{}'::jsonb THEN RETURN false; END IF;
    FOR role_key IN SELECT jsonb_object_keys(config -> 'roles') LOOP
        IF btrim(role_key) = '' OR role_key <> btrim(role_key) THEN RETURN false; END IF;
    END LOOP;
    FOR bound IN SELECT config -> 'exploration' UNION ALL SELECT value FROM jsonb_each(config -> 'roles') LOOP
        IF jsonb_typeof(bound) IS DISTINCT FROM 'object'
            OR NOT bound ?& ARRAY['maxQuestions', 'timeLimitSeconds']
            OR bound - ARRAY['maxQuestions', 'timeLimitSeconds'] <> '{}'::jsonb
            OR jsonb_typeof(bound -> 'maxQuestions') IS DISTINCT FROM 'number'
            OR jsonb_typeof(bound -> 'timeLimitSeconds') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
        IF (bound ->> 'maxQuestions') !~ '^[0-9]+$' OR (bound ->> 'timeLimitSeconds') !~ '^[0-9]+$'
            OR (bound ->> 'maxQuestions')::numeric NOT BETWEEN 1 AND 2147483647
            OR (bound ->> 'timeLimitSeconds')::numeric NOT BETWEEN 1 AND 2147483647 THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
END;
$$;

ALTER TABLE platform.baseline_adaptive_blueprint_version
    ADD CONSTRAINT occupation_baseline_name_time_limits CHECK (
        CASE WHEN scope_policy = 'FULL_OCCUPATION_V2' THEN
            char_length(btrim(name)) <= 100
            AND occupation_time_limit_seconds::bigint BETWEEN occupation_max_questions::bigint * 30
                AND occupation_max_questions::bigint * 120
        ELSE true END) NOT VALID;
COMMENT ON CONSTRAINT occupation_baseline_name_time_limits ON platform.baseline_adaptive_blueprint_version IS
    'New full-Occupation versions: name <=100 Unicode characters, total seconds between maxQuestions*30 and *120; not per-item timers. No history rewrite.';
