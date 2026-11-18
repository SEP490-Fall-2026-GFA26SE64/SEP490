-- Repair renamed job-position scope guards without changing applied migration checksums.
-- Historical role-scoped attempts retain their subset; both full-scope policies use the role union.

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
                AND blueprint_version = NEW.blueprint_version AND role_id = NEW.target_role_id;
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
                AND (attempt.scope_policy IN ('FULL_OCCUPATION_V2', 'FULL_JOB_POSITION_V2') OR attempt.target_role_id IS NULL OR role_id = attempt.target_role_id)),
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
