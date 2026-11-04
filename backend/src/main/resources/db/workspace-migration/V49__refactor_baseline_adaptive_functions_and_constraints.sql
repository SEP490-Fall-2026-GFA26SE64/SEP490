-- V49: Update baseline adaptive configuration validation and triggers for Job Position bounds & scope policy

-- 1. Configuration validation function supporting jobPositionBounds and occupationBounds
CREATE OR REPLACE FUNCTION platform.valid_adaptive_blueprint_configuration(config jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE bound jsonb; role_key text;
BEGIN
    IF jsonb_typeof(config) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    IF config ? 'jobPositionBounds' OR config ? 'occupationBounds' THEN
        IF NOT (config ?& ARRAY['name','jobPositionBounds'] OR config ?& ARRAY['name','occupationBounds'])
            OR (config - ARRAY['name','jobPositionBounds','occupationBounds']) <> '{}'::jsonb
            OR jsonb_typeof(config -> 'name') IS DISTINCT FROM 'string'
            OR btrim(config ->> 'name') = '' THEN RETURN false; END IF;
        bound := COALESCE(config -> 'jobPositionBounds', config -> 'occupationBounds');
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

-- 2. Guard adaptive working revision
CREATE OR REPLACE FUNCTION platform.guard_adaptive_working_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.state <> 'OPEN' THEN
        RAISE EXCEPTION 'Closed adaptive working revision is immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['revision', 'configuration', 'state', 'updated_by', 'updated_at', 'closed_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revision', 'configuration', 'state', 'updated_by', 'updated_at', 'closed_at'])
        OR NEW.revision <> OLD.revision + 1 THEN
        RAISE EXCEPTION 'Adaptive revision requires stable identity and next revision' USING ERRCODE = '23514';
    END IF;
    IF (OLD.configuration ? 'jobPositionBounds' OR OLD.configuration ? 'occupationBounds')
       IS DISTINCT FROM (NEW.configuration ? 'jobPositionBounds' OR NEW.configuration ? 'occupationBounds') THEN
        RAISE EXCEPTION 'Archive the legacy Draft before creating a new-format Draft' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Scope policy check constraints
ALTER TABLE platform.baseline_adaptive_blueprint_version
    DROP CONSTRAINT IF EXISTS baseline_adaptive_blueprint_version_scope_policy_check;

ALTER TABLE platform.baseline_adaptive_blueprint_version
    ADD CONSTRAINT baseline_adaptive_blueprint_version_scope_policy_check
    CHECK (scope_policy IS NULL OR scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2'));

ALTER TABLE platform.baseline_adaptive_attempt
    DROP CONSTRAINT IF EXISTS baseline_adaptive_attempt_scope_policy_check;

ALTER TABLE platform.baseline_adaptive_attempt
    ADD CONSTRAINT baseline_adaptive_attempt_scope_policy_check
    CHECK (scope_policy IS NULL OR scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2'));

-- 4. Guard adaptive blueprint role
CREATE OR REPLACE FUNCTION platform.guard_adaptive_blueprint_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'baseline_adaptive_blueprint_role' THEN
        IF EXISTS (SELECT 1 FROM platform.baseline_adaptive_blueprint_version parent
            WHERE parent.blueprint_id = NEW.blueprint_id AND parent.version = NEW.blueprint_version
              AND ((parent.scope_policy IS NULL AND (NEW.max_questions IS NULL OR NEW.time_limit_seconds IS NULL))
                OR (parent.scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2') AND (NEW.max_questions IS NOT NULL OR NEW.time_limit_seconds IS NOT NULL)))) THEN
            RAISE EXCEPTION 'Role bounds must match the pinned Blueprint scope policy' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 5. Guard adaptive attempt header
CREATE OR REPLACE FUNCTION platform.guard_adaptive_attempt_header() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE blueprint platform.baseline_adaptive_blueprint_version%ROWTYPE;
DECLARE prior platform.baseline_adaptive_attempt%ROWTYPE;
DECLARE bounds record;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Adaptive attempt history cannot be deleted' USING ERRCODE = '23514';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.state <> 'IN_PROGRESS' OR NEW.revision <> OLD.revision + 1
            OR (to_jsonb(NEW) - ARRAY['state','revision','finished_at','completion_reason'])
                IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','revision','finished_at','completion_reason']) THEN
            RAISE EXCEPTION 'Attempt is terminal, stale or pinned inputs changed' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    IF NEW.state <> 'IN_PROGRESS' OR NEW.revision <> 1 THEN
        RAISE EXCEPTION 'Attempts must start in progress at revision one' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO STRICT blueprint FROM platform.baseline_adaptive_blueprint_version
        WHERE blueprint_id = NEW.blueprint_id AND version = NEW.blueprint_version;
    IF ROW(NEW.model_version_id, NEW.mastery_mapping_version_id, NEW.parameter_set_id, NEW.catalog_fingerprint)
        IS DISTINCT FROM ROW(blueprint.model_version_id, blueprint.mastery_mapping_version_id,
            blueprint.parameter_set_id, blueprint.catalog_fingerprint) THEN
        RAISE EXCEPTION 'Attempt technical/catalog pins must match Blueprint' USING ERRCODE = '23514';
    END IF;
    IF NEW.scope_policy IS DISTINCT FROM blueprint.scope_policy THEN
        RAISE EXCEPTION 'Attempt scope policy must match its immutable Blueprint' USING ERRCODE = '23514';
    END IF;
    IF blueprint.scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2') THEN
        SELECT blueprint.job_position_max_questions AS maximum,
            blueprint.job_position_time_limit_seconds AS duration INTO bounds;
    ELSIF NEW.target_role_id IS NULL THEN
        SELECT blueprint.exploration_max_questions AS maximum,
            blueprint.exploration_time_limit_seconds AS duration INTO bounds;
    ELSE
        SELECT max_questions AS maximum, time_limit_seconds AS duration INTO STRICT bounds
            FROM platform.baseline_adaptive_blueprint_role WHERE blueprint_id = NEW.blueprint_id
                AND blueprint_version = NEW.blueprint_version AND target_role_id = NEW.target_role_id;
    END IF;
    IF ROW(NEW.max_questions, NEW.time_limit_seconds) IS DISTINCT FROM ROW(bounds.maximum, bounds.duration) THEN
        RAISE EXCEPTION 'Attempt bounds must match pinned Blueprint bounds' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM platform.baseline_adaptive_attempt
        WHERE organization_id = NEW.organization_id AND learner_id = NEW.learner_id
            AND job_position_id = NEW.job_position_id AND state = 'IN_PROGRESS' AND attempt_id <> NEW.attempt_id) THEN
        RAISE EXCEPTION 'Learner already has an in-progress baseline attempt for this job position' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO prior FROM platform.baseline_adaptive_attempt
        WHERE organization_id = NEW.organization_id AND learner_id = NEW.learner_id
            AND job_position_id = NEW.job_position_id AND state <> 'IN_PROGRESS'
        ORDER BY started_at DESC LIMIT 1;
    IF FOUND AND (prior.finished_at IS NULL OR NEW.started_at < prior.finished_at
            OR ROW(prior.organization_id, prior.learner_id, prior.job_position_id)
                IS DISTINCT FROM ROW(NEW.organization_id, NEW.learner_id, NEW.job_position_id)) THEN
        RAISE EXCEPTION 'Attempt sequence must follow completed prior attempts' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Name and time limit constraints
ALTER TABLE platform.baseline_adaptive_blueprint_version
    DROP CONSTRAINT IF EXISTS occupation_baseline_name_time_limits;

ALTER TABLE platform.baseline_adaptive_blueprint_version
    DROP CONSTRAINT IF EXISTS job_position_baseline_name_time_limits;

ALTER TABLE platform.baseline_adaptive_blueprint_version
    ADD CONSTRAINT job_position_baseline_name_time_limits CHECK (
        scope_policy IS DISTINCT FROM 'FULL_OCCUPATION_V2' AND scope_policy IS DISTINCT FROM 'FULL_JOB_POSITION_V2'
        OR (char_length(btrim(name)) <= 100
            AND job_position_time_limit_seconds::bigint BETWEEN job_position_max_questions::bigint * 30
                AND job_position_max_questions::bigint * 120
        )
    );

-- 7. Guard baseline working namespace (replaces occupation_id with job_position_id)
CREATE OR REPLACE FUNCTION platform.guard_baseline_working_namespace() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM platform.baseline_blueprint WHERE blueprint_id = NEW.blueprint_id FOR UPDATE;
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'baseline_adaptive_blueprint_working_revision'
            AND (NEW.state <> 'OPEN' OR NEW.revision <> 1) THEN
            RAISE EXCEPTION 'Adaptive working revision must start open at revision one' USING ERRCODE = '23514';
        END IF;
        IF NEW.state = 'OPEN' THEN
            INSERT INTO platform.baseline_blueprint_working_registry(blueprint_id, working_revision_id, contract_family)
            VALUES (NEW.blueprint_id, NEW.working_revision_id,
                CASE WHEN TG_TABLE_NAME = 'baseline_blueprint_working_revision' THEN 'FIXED' ELSE 'ADAPTIVE' END);
        END IF;
    ELSE
        IF NEW.blueprint_id <> OLD.blueprint_id OR NEW.working_revision_id <> OLD.working_revision_id
            OR NEW.organization_id <> OLD.organization_id OR NEW.job_position_id <> OLD.job_position_id THEN
            RAISE EXCEPTION 'Working revision scope is immutable' USING ERRCODE = '23514';
        END IF;
        IF OLD.state = 'OPEN' AND NEW.state <> 'OPEN' THEN
            DELETE FROM platform.baseline_blueprint_working_registry
            WHERE blueprint_id = OLD.blueprint_id AND working_revision_id = OLD.working_revision_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 8. Validate baseline activation event
CREATE OR REPLACE FUNCTION platform.validate_baseline_activation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation_event event
        WHERE event.organization_id = NEW.organization_id AND event.job_position_id = NEW.job_position_id
          AND event.activation_revision = NEW.activation_revision AND event.blueprint_id = NEW.blueprint_id
          AND event.blueprint_version IS NOT DISTINCT FROM NEW.blueprint_version
          AND event.actor_id = NEW.activated_by AND event.occurred_at = NEW.activated_at) THEN
        RAISE EXCEPTION 'Activation requires matching append-only audit event' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- 9. Guard baseline activation event
CREATE OR REPLACE FUNCTION platform.guard_baseline_activation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation current_pointer
        WHERE current_pointer.organization_id = NEW.organization_id AND current_pointer.job_position_id = NEW.job_position_id
          AND current_pointer.activation_revision = NEW.activation_revision AND current_pointer.blueprint_id = NEW.blueprint_id
          AND current_pointer.blueprint_version IS NOT DISTINCT FROM NEW.blueprint_version
          AND current_pointer.activated_by = NEW.actor_id AND current_pointer.activated_at = NEW.occurred_at) THEN
        RAISE EXCEPTION 'Activation event must describe the current transaction pointer' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- 10. Guard baseline activation
CREATE OR REPLACE FUNCTION platform.guard_baseline_activation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Disable availability rather than deleting the pointer' USING ERRCODE = '23514';
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.activation_revision <> 1 OR NEW.blueprint_version IS NULL THEN
            RAISE EXCEPTION 'First activation requires version and revision one' USING ERRCODE = '23514';
        END IF;
    ELSIF NEW.organization_id <> OLD.organization_id OR NEW.job_position_id <> OLD.job_position_id
        OR NEW.blueprint_id <> OLD.blueprint_id OR NEW.activation_revision <> OLD.activation_revision + 1 THEN
        RAISE EXCEPTION 'Activation requires stable scope and next revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- 11. Validate baseline assessment series
CREATE OR REPLACE FUNCTION platform.validate_baseline_assessment_series() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    candidate record;
    active record;
    working record;
BEGIN
    IF NEW.working_revision_id IS NOT NULL THEN
        SELECT organization_id, job_position_id, blueprint_id, state
        INTO working
        FROM platform.baseline_blueprint_working_revision
        WHERE working_revision_id = NEW.working_revision_id;
        IF NOT FOUND OR working.organization_id <> NEW.organization_id
            OR working.job_position_id <> NEW.job_position_id
            OR working.blueprint_id <> NEW.blueprint_id
            OR working.state <> 'OPEN' THEN
            RAISE EXCEPTION 'Working revision does not belong to the open baseline series'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.open_assessment_version_id IS NOT NULL THEN
        SELECT blueprint_id, blueprint_version, publication_state,
               baseline_candidate_state, reviewed_content_hash
        INTO candidate
        FROM platform.assessment_version
        WHERE assessment_version_id = NEW.open_assessment_version_id
          AND purpose = 'BASELINE';
        IF NOT FOUND OR candidate.blueprint_id <> NEW.blueprint_id
            OR candidate.blueprint_version IS DISTINCT FROM NEW.pending_blueprint_version
            OR candidate.publication_state <> 'DRAFT'
            OR candidate.baseline_candidate_state <> 'OPEN' THEN
            RAISE EXCEPTION 'Open assessment candidate does not match its pending blueprint'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.active_assessment_version_id IS NOT NULL THEN
        SELECT blueprint_id, publication_state INTO active
        FROM platform.assessment_version
        WHERE assessment_version_id = NEW.active_assessment_version_id
          AND purpose = 'BASELINE';
        IF NOT FOUND OR active.blueprint_id <> NEW.blueprint_id
            OR active.publication_state <> 'PUBLISHED' THEN
            RAISE EXCEPTION 'Active assessment does not belong to this baseline series'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 12. Update adaptive_blueprint_scope_bounds to support FULL_JOB_POSITION_V2
ALTER TABLE platform.baseline_adaptive_blueprint_version
    DROP CONSTRAINT IF EXISTS adaptive_blueprint_scope_bounds;

ALTER TABLE platform.baseline_adaptive_blueprint_version
    ADD CONSTRAINT adaptive_blueprint_scope_bounds CHECK (
        (scope_policy IS NULL AND job_position_max_questions IS NULL AND job_position_time_limit_seconds IS NULL
            AND exploration_max_questions IS NOT NULL AND exploration_time_limit_seconds IS NOT NULL)
        OR (scope_policy IS NOT NULL AND scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2')
            AND job_position_max_questions IS NOT NULL AND job_position_max_questions > 0
            AND job_position_time_limit_seconds IS NOT NULL AND job_position_time_limit_seconds > 0
            AND exploration_max_questions IS NULL AND exploration_time_limit_seconds IS NULL));

-- 13. Validate employee assignment (updates occupation_reference_id to job_position_reference_id)
CREATE OR REPLACE FUNCTION platform.validate_employee_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    target uuid;
BEGIN
    target := COALESCE(NEW.membership_id, OLD.membership_id);
    IF EXISTS (
        SELECT 1 FROM platform.organization_membership m
        JOIN platform.organization_membership_role r USING (membership_id)
        WHERE m.membership_id = target AND r.role_code = 'EMPLOYEE'
            AND (m.department_id IS NULL OR m.job_position_reference_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Employee department and job position references are required' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

-- 14. Guard adaptive membership insert (supports FULL_JOB_POSITION_V2)
CREATE OR REPLACE FUNCTION platform.guard_adaptive_membership_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM platform.baseline_adaptive_blueprint_version
    WHERE blueprint_id = NEW.blueprint_id AND version = NEW.blueprint_version FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adaptive parent version must be visible before membership' USING ERRCODE = '23503';
    END IF;
    IF EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation_event
        WHERE blueprint_id = NEW.blueprint_id AND blueprint_version = NEW.blueprint_version) THEN
        RAISE EXCEPTION 'Finalized Blueprint membership is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'baseline_adaptive_blueprint_role' THEN
        IF EXISTS (SELECT 1 FROM platform.baseline_adaptive_blueprint_version parent
            WHERE parent.blueprint_id = NEW.blueprint_id AND parent.version = NEW.blueprint_version
              AND ((parent.scope_policy IS NULL AND (NEW.max_questions IS NULL OR NEW.time_limit_seconds IS NULL))
                OR (parent.scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2') AND (NEW.max_questions IS NOT NULL OR NEW.time_limit_seconds IS NOT NULL)))) THEN
            RAISE EXCEPTION 'Role bounds must match the pinned Blueprint scope policy' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
