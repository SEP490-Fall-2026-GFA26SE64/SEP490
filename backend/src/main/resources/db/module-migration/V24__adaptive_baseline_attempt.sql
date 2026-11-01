-- Additive REQ-002-F01 storage. V1-V18 and generic/module attempts remain unchanged.
-- B3/B5-B7 supply authorized transactions, policy evaluation and outbox delivery.
CREATE TABLE platform.baseline_adaptive_attempt (
    attempt_id uuid PRIMARY KEY CHECK (attempt_id <> '00000000-0000-0000-0000-000000000000'),
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    occupation_id text NOT NULL CHECK (occupation_id <> '' AND occupation_id = btrim(occupation_id)),
    attempt_purpose text NOT NULL CHECK (attempt_purpose IN ('ROLE_REQUIREMENT', 'OCCUPATION_EXPLORATION')),
    target_role_id text,
    target_selection_revision bigint CHECK (target_selection_revision > 0),
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL,
    model_version_id uuid NOT NULL,
    mastery_mapping_version_id uuid NOT NULL,
    parameter_set_id uuid NOT NULL,
    catalog_fingerprint text NOT NULL CHECK (btrim(catalog_fingerprint) <> ''),
    max_questions integer NOT NULL CHECK (max_questions > 0),
    time_limit_seconds integer NOT NULL CHECK (time_limit_seconds > 0),
    state text NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (state IN ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'INVALIDATED')),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deadline_at timestamptz NOT NULL,
    finished_at timestamptz,
    completion_reason text,
    replaces_attempt_id uuid UNIQUE,
    UNIQUE (attempt_id, organization_id),
    UNIQUE (attempt_id, organization_id, learner_id, occupation_id),
    UNIQUE (attempt_id, parameter_set_id),
    FOREIGN KEY (learner_id, organization_id) REFERENCES platform.account(account_id, organization_id),
    FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version)
        REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version),
    FOREIGN KEY (blueprint_id, blueprint_version, target_role_id)
        REFERENCES platform.baseline_adaptive_blueprint_role(blueprint_id, blueprint_version, role_id),
    FOREIGN KEY (replaces_attempt_id, organization_id, learner_id, occupation_id)
        REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id),
    CHECK ((attempt_purpose = 'ROLE_REQUIREMENT' AND target_role_id IS NOT NULL)
        OR (attempt_purpose = 'OCCUPATION_EXPLORATION' AND target_role_id IS NULL AND target_selection_revision IS NULL)),
    CHECK (deadline_at = started_at + time_limit_seconds * interval '1 second'),
    CHECK (isfinite(started_at) AND isfinite(deadline_at)),
    CHECK (replaces_attempt_id IS NULL OR replaces_attempt_id <> attempt_id),
    CHECK ((state = 'IN_PROGRESS' AND finished_at IS NULL AND completion_reason IS NULL)
        OR (finished_at IS NOT NULL AND completion_reason IS NOT NULL
            AND isfinite(finished_at) AND finished_at >= started_at AND (
            (state = 'SUBMITTED' AND completion_reason = 'MANUAL' AND finished_at < deadline_at)
            OR (state = 'AUTO_SUBMITTED' AND (
                (completion_reason = 'ADAPTIVE_STOP' AND finished_at < deadline_at)
                OR (completion_reason = 'DEADLINE' AND finished_at >= deadline_at)))
            OR (state = 'INVALIDATED' AND (completion_reason = 'TECHNICAL_FAILURE'
                OR (completion_reason = 'DEADLINE' AND finished_at >= deadline_at))))))
);
CREATE UNIQUE INDEX baseline_attempt_one_active_idx
    ON platform.baseline_adaptive_attempt(organization_id, learner_id, occupation_id) WHERE state = 'IN_PROGRESS';
CREATE UNIQUE INDEX baseline_attempt_one_success_idx
    ON platform.baseline_adaptive_attempt(organization_id, learner_id, occupation_id)
    WHERE state IN ('SUBMITTED', 'AUTO_SUBMITTED');
-- Exactly one root and at most one successor per immutable predecessor form a single allowance chain.
CREATE UNIQUE INDEX baseline_attempt_one_root_idx
    ON platform.baseline_adaptive_attempt(organization_id, learner_id, occupation_id) WHERE replaces_attempt_id IS NULL;
CREATE INDEX baseline_attempt_deadline_idx
    ON platform.baseline_adaptive_attempt(deadline_at, attempt_id) WHERE state = 'IN_PROGRESS';
CREATE INDEX baseline_attempt_history_idx
    ON platform.baseline_adaptive_attempt(organization_id, learner_id, occupation_id, started_at DESC, attempt_id);
CREATE INDEX baseline_attempt_blueprint_idx ON platform.baseline_adaptive_attempt(blueprint_id, blueprint_version);

CREATE TABLE platform.baseline_attempt_skill_state (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    micro_skill_id text NOT NULL CHECK (micro_skill_id <> '' AND micro_skill_id = btrim(micro_skill_id)),
    theta numeric NOT NULL CHECK (theta > '-Infinity'::numeric AND theta < 'Infinity'::numeric),
    standard_error numeric NOT NULL CHECK (standard_error > 0 AND standard_error < 'Infinity'::numeric),
    test_information numeric NOT NULL CHECK (test_information >= 0 AND test_information < 'Infinity'::numeric),
    answered_count integer NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision = answered_count::bigint + 1),
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (attempt_id, micro_skill_id),
    UNIQUE (attempt_id, organization_id, micro_skill_id),
    FOREIGN KEY (attempt_id, organization_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id)
);
-- Pins unseen eligible versions as well as the presented sequence; no current-eligibility reread on resume.
CREATE TABLE platform.baseline_attempt_pool_item (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    parameter_set_id uuid NOT NULL,
    item_version_id uuid NOT NULL,
    micro_skill_id text NOT NULL,
    PRIMARY KEY (attempt_id, item_version_id),
    UNIQUE (attempt_id, organization_id, item_version_id, micro_skill_id),
    FOREIGN KEY (attempt_id, organization_id, micro_skill_id)
        REFERENCES platform.baseline_attempt_skill_state(attempt_id, organization_id, micro_skill_id),
    FOREIGN KEY (attempt_id, parameter_set_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, parameter_set_id),
    FOREIGN KEY (parameter_set_id, item_version_id, micro_skill_id)
        REFERENCES platform.irt_item_parameter(parameter_set_id, item_version_id, micro_skill_id)
);

CREATE FUNCTION platform.valid_baseline_option_order(options jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT CASE WHEN jsonb_typeof(options) = 'array' THEN
        jsonb_array_length(options) >= 2
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(options) option
            WHERE jsonb_typeof(option) <> 'string' OR btrim(option #>> '{}') = '')
        AND (SELECT count(DISTINCT option) = count(*) FROM jsonb_array_elements(options) option)
    ELSE false END
$$;
CREATE TABLE platform.baseline_attempt_item (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    position integer NOT NULL CHECK (position > 0),
    item_version_id uuid NOT NULL,
    micro_skill_id text NOT NULL,
    option_order jsonb NOT NULL CHECK (platform.valid_baseline_option_order(option_order)),
    selection_trace jsonb NOT NULL CHECK (jsonb_typeof(selection_trace) = 'object'),
    presented_at timestamptz NOT NULL,
    PRIMARY KEY (attempt_id, position),
    UNIQUE (attempt_id, item_version_id),
    UNIQUE (attempt_id, organization_id, position),
    FOREIGN KEY (attempt_id, organization_id, item_version_id, micro_skill_id)
        REFERENCES platform.baseline_attempt_pool_item(attempt_id, organization_id, item_version_id, micro_skill_id)
);
CREATE TABLE platform.baseline_attempt_response (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    position integer NOT NULL,
    response_payload jsonb NOT NULL CHECK (jsonb_typeof(response_payload) = 'object'),
    is_correct boolean NOT NULL,
    accepted_at timestamptz NOT NULL,
    request_id uuid NOT NULL,
    PRIMARY KEY (attempt_id, position),
    UNIQUE (organization_id, request_id),
    FOREIGN KEY (attempt_id, organization_id, position)
        REFERENCES platform.baseline_attempt_item(attempt_id, organization_id, position)
);
CREATE TABLE platform.baseline_attempt_result (
    attempt_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    answered_count integer NOT NULL CHECK (answered_count > 0),
    correct_count integer NOT NULL CHECK (correct_count >= 0 AND correct_count <= answered_count),
    raw_score numeric GENERATED ALWAYS AS (correct_count::numeric / answered_count) STORED,
    result_status text NOT NULL CHECK (result_status IN ('SUBMITTED', 'AUTO_SUBMITTED')),
    scored_at timestamptz NOT NULL,
    mastery_event_id uuid NOT NULL UNIQUE REFERENCES platform.outbox_event(event_id),
    UNIQUE (attempt_id, organization_id, mastery_event_id),
    FOREIGN KEY (attempt_id, organization_id) REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id)
);
CREATE TABLE platform.baseline_attempt_skill_result (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    micro_skill_id text NOT NULL,
    theta numeric NOT NULL CHECK (theta > '-Infinity'::numeric AND theta < 'Infinity'::numeric),
    standard_error numeric NOT NULL CHECK (standard_error > 0 AND standard_error < 'Infinity'::numeric),
    estimated_mastery platform.unit_interval NOT NULL,
    mastery platform.unit_interval NOT NULL CHECK (mastery <= estimated_mastery),
    confidence_label text NOT NULL CHECK (btrim(confidence_label) <> ''),
    mastery_mapping_version_id uuid NOT NULL REFERENCES platform.mastery_mapping_version,
    finalized_at timestamptz NOT NULL,
    PRIMARY KEY (attempt_id, micro_skill_id),
    UNIQUE (attempt_id, organization_id, micro_skill_id),
    FOREIGN KEY (attempt_id, organization_id, micro_skill_id)
        REFERENCES platform.baseline_attempt_skill_state(attempt_id, organization_id, micro_skill_id)
);
CREATE TABLE platform.baseline_mastery_evidence (
    attempt_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    occupation_id text NOT NULL,
    micro_skill_id text NOT NULL,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    mastery_mapping_version_id uuid NOT NULL REFERENCES platform.mastery_mapping_version,
    parameter_set_id uuid NOT NULL REFERENCES platform.irt_parameter_set,
    theta numeric NOT NULL,
    standard_error numeric NOT NULL,
    estimated_mastery platform.unit_interval NOT NULL,
    mastery platform.unit_interval NOT NULL,
    confidence_label text NOT NULL,
    mastery_event_id uuid NOT NULL,
    emitted_at timestamptz NOT NULL,
    PRIMARY KEY (attempt_id, micro_skill_id),
    FOREIGN KEY (attempt_id, organization_id, learner_id, occupation_id)
        REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id),
    FOREIGN KEY (attempt_id, organization_id, micro_skill_id)
        REFERENCES platform.baseline_attempt_skill_result(attempt_id, organization_id, micro_skill_id),
    FOREIGN KEY (attempt_id, organization_id, mastery_event_id)
        REFERENCES platform.baseline_attempt_result(attempt_id, organization_id, mastery_event_id)
);
CREATE TABLE platform.baseline_attempt_command (
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    idempotency_key text NOT NULL CHECK (idempotency_key <> '' AND idempotency_key = btrim(idempotency_key)
        AND char_length(idempotency_key) <= 200),
    attempt_id uuid NOT NULL,
    occupation_id text NOT NULL,
    operation text NOT NULL CHECK (operation IN ('START', 'ANSWER', 'SUBMIT')),
    request_hash platform.content_hash NOT NULL,
    response_payload jsonb NOT NULL CHECK (jsonb_typeof(response_payload) = 'object'),
    created_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id, actor_id, idempotency_key),
    FOREIGN KEY (attempt_id, organization_id, actor_id, occupation_id)
        REFERENCES platform.baseline_adaptive_attempt(attempt_id, organization_id, learner_id, occupation_id)
);
CREATE INDEX baseline_attempt_command_attempt_idx ON platform.baseline_attempt_command(attempt_id, created_at);
CREATE INDEX baseline_mastery_evidence_learner_idx
    ON platform.baseline_mastery_evidence(organization_id, learner_id, occupation_id);

CREATE FUNCTION platform.guard_adaptive_attempt_header() RETURNS trigger LANGUAGE plpgsql AS $$
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
    IF NEW.target_role_id IS NULL THEN
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
CREATE TRIGGER adaptive_attempt_header BEFORE INSERT OR UPDATE OR DELETE ON platform.baseline_adaptive_attempt
    FOR EACH ROW EXECUTE FUNCTION platform.guard_adaptive_attempt_header();

-- Child writes acquire the same parent lock as answers/finalization; immutable rows never update/delete.
CREATE FUNCTION platform.guard_adaptive_attempt_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt platform.baseline_adaptive_attempt%ROWTYPE;
DECLARE item platform.baseline_attempt_item%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND TG_TABLE_NAME <> 'baseline_attempt_skill_state') THEN
        RAISE EXCEPTION 'Adaptive child history is immutable' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO STRICT attempt FROM platform.baseline_adaptive_attempt WHERE attempt_id = NEW.attempt_id FOR UPDATE;
    IF TG_TABLE_NAME IN ('baseline_attempt_result', 'baseline_attempt_skill_result', 'baseline_mastery_evidence') THEN
        IF attempt.state = 'INVALIDATED' THEN
            RAISE EXCEPTION 'Invalidated attempts produce no result or mastery' USING ERRCODE = '23514';
        END IF;
        RETURN NEW; -- Deferred completeness checks allow finalization in either write order.
    END IF;
    IF attempt.state <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Terminal attempts accept no mutable child state' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'baseline_attempt_pool_item' OR
        (TG_TABLE_NAME = 'baseline_attempt_skill_state' AND TG_OP = 'INSERT') THEN
        IF attempt.revision <> 1 OR EXISTS (SELECT 1 FROM platform.baseline_attempt_item WHERE attempt_id = NEW.attempt_id) THEN
            RAISE EXCEPTION 'Starting pool/skill membership is sealed by the first item' USING ERRCODE = '23514';
        END IF;
    ELSIF TG_TABLE_NAME = 'baseline_attempt_skill_state' THEN
        IF NEW.revision <> OLD.revision + 1 OR NEW.answered_count <> OLD.answered_count + 1
            OR ROW(NEW.attempt_id, NEW.organization_id, NEW.micro_skill_id)
                IS DISTINCT FROM ROW(OLD.attempt_id, OLD.organization_id, OLD.micro_skill_id) THEN
            RAISE EXCEPTION 'Skill state requires same identity and next answer revision' USING ERRCODE = '23514';
        END IF;
    ELSIF TG_TABLE_NAME = 'baseline_attempt_item' THEN
        IF NEW.position > attempt.max_questions OR NEW.presented_at < attempt.started_at
            OR NEW.presented_at >= attempt.deadline_at
            OR NEW.position <> (SELECT count(*) + 1 FROM platform.baseline_attempt_item WHERE attempt_id = NEW.attempt_id)
            OR (NEW.position > 1 AND NOT EXISTS (SELECT 1 FROM platform.baseline_attempt_response
                WHERE attempt_id = NEW.attempt_id AND position = NEW.position - 1 AND accepted_at <= NEW.presented_at)) THEN
            RAISE EXCEPTION 'Presentation must be next, unseen and within bounds/deadline' USING ERRCODE = '23514';
        END IF;
        IF EXISTS (
            WITH expected AS (SELECT option ->> 'id' AS id FROM platform.item_version version,
                jsonb_array_elements(version.response_schema -> 'options') option WHERE version.item_version_id = NEW.item_version_id),
            actual AS (SELECT jsonb_array_elements_text(NEW.option_order) AS id)
            (SELECT * FROM expected EXCEPT SELECT * FROM actual) UNION ALL
            (SELECT * FROM actual EXCEPT SELECT * FROM expected)) THEN
            RAISE EXCEPTION 'Option order must contain exactly the pinned item options' USING ERRCODE = '23514';
        END IF;
    ELSIF TG_TABLE_NAME = 'baseline_attempt_response' THEN
        SELECT * INTO STRICT item FROM platform.baseline_attempt_item
            WHERE attempt_id = NEW.attempt_id AND position = NEW.position;
        IF NEW.accepted_at < item.presented_at OR NEW.accepted_at >= attempt.deadline_at
            OR jsonb_typeof(NEW.response_payload -> 'selectedOptionId') IS DISTINCT FROM 'string'
            OR NOT (item.option_order ? (NEW.response_payload ->> 'selectedOptionId')) THEN
            RAISE EXCEPTION 'Response must select a presented option strictly before deadline' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Validate committed aggregate shape, not a numerical policy. B4/B7 own minimum evidence and formulas.
CREATE FUNCTION platform.validate_adaptive_attempt_aggregate() RETURNS trigger LANGUAGE plpgsql AS $$
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
                AND (attempt.target_role_id IS NULL OR role_id = attempt.target_role_id)),
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

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['baseline_attempt_skill_state', 'baseline_attempt_pool_item',
        'baseline_attempt_item', 'baseline_attempt_response', 'baseline_attempt_result',
        'baseline_attempt_skill_result', 'baseline_mastery_evidence'] LOOP
        EXECUTE format('CREATE TRIGGER adaptive_attempt_child BEFORE INSERT OR UPDATE OR DELETE ON platform.%I
            FOR EACH ROW EXECUTE FUNCTION platform.guard_adaptive_attempt_child()', table_name);
    END LOOP;
    -- Pool inserts are only possible during initial assembly, already checked by the header trigger.
    -- Avoid scheduling the full aggregate scan once for every eligible unseen item.
    FOREACH table_name IN ARRAY ARRAY['baseline_adaptive_attempt', 'baseline_attempt_skill_state',
        'baseline_attempt_item', 'baseline_attempt_response', 'baseline_attempt_result',
        'baseline_attempt_skill_result', 'baseline_mastery_evidence'] LOOP
        EXECUTE format('CREATE CONSTRAINT TRIGGER adaptive_attempt_complete AFTER INSERT OR UPDATE ON platform.%I
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_adaptive_attempt_aggregate()', table_name);
    END LOOP;
END;
$$;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON platform.baseline_attempt_command
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();

COMMENT ON TABLE platform.baseline_attempt_pool_item IS
    'Server-pinned eligible item/skill manifest. Sealed at first presentation; never re-resolve current publication on resume.';
COMMENT ON TABLE platform.baseline_attempt_command IS
    'Server-only immutable command outcomes keyed by organization/Employee/key across Occupations and operations; reauthorize before replay.';
COMMENT ON TABLE platform.baseline_mastery_evidence IS
    'One initialization per attempt/skill tied to one attempt-level outbox identity. Never independent response-level BKT evidence.';
COMMENT ON INDEX platform.baseline_attempt_deadline_idx IS
    'B3/B7 claim expired IN_PROGRESS rows in bounded PostgreSQL FOR UPDATE SKIP LOCKED transactions.';
