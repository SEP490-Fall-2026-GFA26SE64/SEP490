-- Approved OB-P07/08: forward compatibility foundation. No legacy row/backfill or admission cutover.
-- Null policy always retains the V18/V19 role/exploration meaning. Apply before deploying its readers.
ALTER TABLE platform.baseline_adaptive_blueprint_version
    ADD COLUMN scope_policy text,
    ADD COLUMN occupation_max_questions integer,
    ADD COLUMN occupation_time_limit_seconds integer,
    ALTER COLUMN exploration_max_questions DROP NOT NULL,
    ALTER COLUMN exploration_time_limit_seconds DROP NOT NULL,
    ADD CONSTRAINT adaptive_blueprint_scope_bounds CHECK (
        (scope_policy IS NULL AND occupation_max_questions IS NULL AND occupation_time_limit_seconds IS NULL
            AND exploration_max_questions IS NOT NULL AND exploration_time_limit_seconds IS NOT NULL)
        OR (scope_policy IS NOT NULL AND scope_policy = 'FULL_OCCUPATION_V2'
            AND occupation_max_questions IS NOT NULL AND occupation_max_questions > 0
            AND occupation_time_limit_seconds IS NOT NULL AND occupation_time_limit_seconds > 0
            AND exploration_max_questions IS NULL AND exploration_time_limit_seconds IS NULL));
ALTER TABLE platform.baseline_adaptive_blueprint_role
    ALTER COLUMN max_questions DROP NOT NULL,
    ALTER COLUMN time_limit_seconds DROP NOT NULL;
ALTER TABLE platform.baseline_adaptive_attempt
    ADD COLUMN scope_policy text CHECK (scope_policy IS NULL OR scope_policy = 'FULL_OCCUPATION_V2');

-- Existing history triggers remain attached, including protection of the newly added scope fields.
-- Function replacements retain legacy branches, tenant/FK/pin/replacement/deadline/result checks.
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
                OR (parent.scope_policy = 'FULL_OCCUPATION_V2' AND (NEW.max_questions IS NOT NULL OR NEW.time_limit_seconds IS NOT NULL)))) THEN
            RAISE EXCEPTION 'Role bounds must match the pinned Blueprint scope policy' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

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
    IF (OLD.configuration ? 'occupationBounds') IS DISTINCT FROM (NEW.configuration ? 'occupationBounds') THEN
        RAISE EXCEPTION 'Archive the legacy Draft before creating a new-format Draft' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

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
    IF blueprint.scope_policy = 'FULL_OCCUPATION_V2' THEN
        SELECT blueprint.occupation_max_questions AS maximum,
            blueprint.occupation_time_limit_seconds AS duration INTO bounds;
    ELSIF NEW.target_role_id IS NULL THEN
        SELECT blueprint.exploration_max_questions AS maximum,
            blueprint.exploration_time_limit_seconds AS duration INTO bounds;
    ELSE
        SELECT max_questions AS maximum, time_limit_seconds AS duration INTO STRICT bounds
            FROM platform.baseline_adaptive_blueprint_role WHERE blueprint_id = NEW.blueprint_id
                AND blueprint_version = NEW.blueprint_version AND role_id = NEW.target_role_id;
    END IF;
    IF ROW(NEW.max_questions, NEW.time_limit_seconds) IS DISTINCT FROM ROW(bounds.maximum, bounds.duration) THEN
        RAISE EXCEPTION 'Attempt bounds must match its pinned purpose/role' USING ERRCODE = '23514';
    END IF;
    IF NEW.replaces_attempt_id IS NOT NULL THEN
        SELECT * INTO STRICT prior FROM platform.baseline_adaptive_attempt
            WHERE attempt_id = NEW.replaces_attempt_id FOR UPDATE;
        IF prior.state <> 'INVALIDATED' OR prior.finished_at > NEW.started_at
            OR ROW(prior.organization_id, prior.learner_id, prior.occupation_id)
                IS DISTINCT FROM ROW(NEW.organization_id, NEW.learner_id, NEW.occupation_id) THEN
            RAISE EXCEPTION 'Only same-scope invalidated history may be replaced' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION platform.validate_adaptive_attempt_aggregate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt platform.baseline_adaptive_attempt%ROWTYPE;
DECLARE answered integer;
DECLARE correct integer;
BEGIN
    SELECT * INTO STRICT attempt FROM platform.baseline_adaptive_attempt WHERE attempt_id = NEW.attempt_id;
    SELECT count(*), count(*) FILTER (WHERE is_correct) INTO answered, correct
        FROM platform.baseline_attempt_response WHERE attempt_id = attempt.attempt_id;
    IF (SELECT count(*) FROM platform.baseline_attempt_pool_item WHERE attempt_id = attempt.attempt_id) < attempt.max_questions
        OR NOT EXISTS (SELECT 1 FROM platform.baseline_attempt_item WHERE attempt_id = attempt.attempt_id AND position = 1)
        OR attempt.revision < answered::bigint + 1 THEN
        RAISE EXCEPTION 'Attempt requires pinned capacity, first item and response revision' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        WITH expected AS (SELECT DISTINCT micro_skill_id FROM platform.baseline_adaptive_blueprint_skill
            WHERE blueprint_id = attempt.blueprint_id AND blueprint_version = attempt.blueprint_version
                AND (attempt.scope_policy = 'FULL_OCCUPATION_V2' OR attempt.target_role_id IS NULL OR role_id = attempt.target_role_id)),
        actual AS (SELECT micro_skill_id FROM platform.baseline_attempt_skill_state WHERE attempt_id = attempt.attempt_id)
        (SELECT * FROM expected EXCEPT SELECT * FROM actual) UNION ALL
        (SELECT * FROM actual EXCEPT SELECT * FROM expected)) THEN
        RAISE EXCEPTION 'Attempt skill scope must equal pinned role or deduplicated role union' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM platform.baseline_attempt_skill_state skill
        WHERE skill.attempt_id = attempt.attempt_id AND (skill.answered_count <> (
            SELECT count(*) FROM platform.baseline_attempt_response response JOIN platform.baseline_attempt_item item
                USING (attempt_id, position) WHERE response.attempt_id = skill.attempt_id AND item.micro_skill_id = skill.micro_skill_id)
            OR skill.updated_at < attempt.started_at OR skill.updated_at >= attempt.deadline_at)) THEN
        RAISE EXCEPTION 'Provisional state must match accepted responses and server timing' USING ERRCODE = '23514';
    END IF;
    IF attempt.finished_at IS NOT NULL AND EXISTS (SELECT 1 FROM platform.baseline_attempt_response
        WHERE attempt_id = attempt.attempt_id AND accepted_at > attempt.finished_at) THEN
        RAISE EXCEPTION 'Completion cannot precede accepted responses' USING ERRCODE = '23514';
    END IF;
    IF attempt.state NOT IN ('SUBMITTED', 'AUTO_SUBMITTED') THEN
        IF EXISTS (SELECT 1 FROM platform.baseline_attempt_result WHERE attempt_id = attempt.attempt_id)
            OR EXISTS (SELECT 1 FROM platform.baseline_attempt_skill_result WHERE attempt_id = attempt.attempt_id)
            OR EXISTS (SELECT 1 FROM platform.baseline_mastery_evidence WHERE attempt_id = attempt.attempt_id) THEN
            RAISE EXCEPTION 'Only successful completion may produce results/mastery' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_attempt_result result JOIN platform.outbox_event event
            ON event.event_id = result.mastery_event_id WHERE result.attempt_id = attempt.attempt_id
            AND result.result_status = attempt.state AND result.answered_count = answered AND result.correct_count = correct
            AND result.scored_at = attempt.finished_at AND event.aggregate_id = attempt.attempt_id)
        OR EXISTS (SELECT 1 FROM platform.baseline_attempt_skill_state state
            LEFT JOIN platform.baseline_attempt_skill_result result USING (attempt_id, micro_skill_id)
            LEFT JOIN platform.baseline_mastery_evidence evidence USING (attempt_id, micro_skill_id)
            WHERE state.attempt_id = attempt.attempt_id AND (result.attempt_id IS NULL OR evidence.attempt_id IS NULL
                OR result.mastery_mapping_version_id <> attempt.mastery_mapping_version_id
                OR result.finalized_at <> attempt.finished_at
                OR ROW(result.theta, result.standard_error) IS DISTINCT FROM ROW(state.theta, state.standard_error)
                OR ROW(evidence.theta, evidence.standard_error, evidence.estimated_mastery, evidence.mastery,
                    evidence.confidence_label, evidence.model_version_id, evidence.mastery_mapping_version_id,
                    evidence.parameter_set_id, evidence.emitted_at)
                    IS DISTINCT FROM ROW(result.theta, result.standard_error, result.estimated_mastery, result.mastery,
                        result.confidence_label, attempt.model_version_id, attempt.mastery_mapping_version_id,
                        attempt.parameter_set_id, attempt.finished_at))) THEN
        RAISE EXCEPTION 'Completion requires consistent immutable result, every skill and one mastery event' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE INDEX baseline_occupation_version_list_idx
    ON platform.baseline_adaptive_blueprint_version(organization_id,created_at DESC,blueprint_id,version);
CREATE INDEX baseline_occupation_draft_list_idx
    ON platform.baseline_adaptive_blueprint_working_revision(organization_id,updated_at DESC,working_revision_id)
    WHERE state = 'OPEN';
CREATE INDEX baseline_occupation_retiring_idx
    ON platform.baseline_adaptive_attempt(organization_id,blueprint_id,blueprint_version) WHERE state = 'IN_PROGRESS';
COMMENT ON COLUMN platform.baseline_adaptive_blueprint_version.scope_policy IS
    'NULL preserves historical role/exploration scope. FULL_OCCUPATION_V2 has one explicit union bound; never infer from target_role_id.';
COMMENT ON COLUMN platform.baseline_adaptive_attempt.scope_policy IS
    'Immutable copied Blueprint policy; nullable legacy history is not backfilled or relabeled.';
