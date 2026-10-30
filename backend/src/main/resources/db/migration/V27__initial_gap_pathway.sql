-- User explicitly approved source V27 creation; application/runtime DB operations remain unauthorized.
-- Additive initial-pathway storage. Preserve legacy pathways and original occupation profiles.
ALTER TABLE platform.employee_role_selection ADD CONSTRAINT initial_selection_scope_key
    UNIQUE (selection_id,organization_id,learner_id,target_revision);
ALTER TABLE platform.employee_occupation_profile ADD CONSTRAINT initial_profile_origin_key
    UNIQUE (organization_id,learner_id,occupation_id,attempt_id);
CREATE TABLE platform.initial_gap_snapshot (
    gap_snapshot_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    occupation_id text NOT NULL,
    baseline_attempt_id uuid NOT NULL,
    gap_input_hash platform.content_hash NOT NULL,
    content_hash platform.content_hash NOT NULL,
    snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (gap_snapshot_id,organization_id,learner_id,selection_id,selection_revision),
    FOREIGN KEY (selection_id,organization_id,learner_id,selection_revision)
        REFERENCES platform.employee_role_selection(selection_id,organization_id,learner_id,target_revision),
    FOREIGN KEY (organization_id,learner_id,occupation_id,baseline_attempt_id)
        REFERENCES platform.employee_occupation_profile(organization_id,learner_id,occupation_id,attempt_id)
);
CREATE TABLE platform.initial_pathway_request (
    request_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    gap_snapshot_id uuid NOT NULL,
    planning_input_hash platform.content_hash NOT NULL,
    algorithm_version text NOT NULL CHECK (btrim(algorithm_version)<>''),
    configuration_version text NOT NULL CHECK (btrim(configuration_version)<>''),
    frozen_input jsonb NOT NULL CHECK (jsonb_typeof(frozen_input)='object'),
    generation_status text NOT NULL CHECK (generation_status IN
        ('PENDING','GENERATING','SUCCEEDED','NO_LEARNING_REQUIRED','UNRESOLVED','BLOCKED','FAILED_RETRYABLE','STALE')),
    reason_code text,
    claim_token uuid,
    claim_worker_version text,
    lease_expires_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
    next_retry_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (request_id,organization_id,learner_id,selection_id,selection_revision),
    UNIQUE (organization_id,learner_id,selection_id,selection_revision,planning_input_hash),
    FOREIGN KEY (gap_snapshot_id,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.initial_gap_snapshot(gap_snapshot_id,organization_id,learner_id,selection_id,selection_revision),
    CHECK ((claim_token IS NULL)=(lease_expires_at IS NULL)),
    CHECK ((claim_token IS NULL)=(claim_worker_version IS NULL)),
    CHECK (generation_status<>'GENERATING' OR claim_token IS NOT NULL)
);
CREATE INDEX initial_request_dispatch ON platform.initial_pathway_request(next_retry_at,created_at,request_id)
    WHERE generation_status IN ('PENDING','FAILED_RETRYABLE','GENERATING');
CREATE TABLE platform.initial_pathway_run (
    run_id uuid PRIMARY KEY,
    request_id uuid NOT NULL REFERENCES platform.initial_pathway_request,
    claim_token uuid NOT NULL UNIQUE,
    worker_version text NOT NULL CHECK (btrim(worker_version)<>''),
    generation_status text NOT NULL CHECK (generation_status IN
        ('SUCCEEDED','NO_LEARNING_REQUIRED','UNRESOLVED','BLOCKED','FAILED_RETRYABLE','STALE')),
    diagnostics jsonb NOT NULL CHECK (jsonb_typeof(diagnostics)='array'),
    finished_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (run_id,request_id)
);
CREATE TABLE platform.initial_pathway_revision (
    request_id uuid NOT NULL,
    revision bigint NOT NULL CHECK (revision>0),
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    run_id uuid NOT NULL REFERENCES platform.initial_pathway_run,
    content_hash platform.content_hash NOT NULL,
    validation_status text NOT NULL CHECK (validation_status IN ('VALID','UNRESOLVED','BLOCKED','STALE')),
    content jsonb NOT NULL CHECK (jsonb_typeof(content)='object'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (request_id,revision),
    UNIQUE (request_id,revision,organization_id,learner_id,selection_id,selection_revision),
    UNIQUE (request_id,revision,content_hash),
    UNIQUE (request_id,revision,organization_id),
    FOREIGN KEY (run_id,request_id) REFERENCES platform.initial_pathway_run(run_id,request_id),
    FOREIGN KEY (request_id,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.initial_pathway_request(request_id,organization_id,learner_id,selection_id,selection_revision)
);
CREATE TABLE platform.initial_pathway_module (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    module_id text NOT NULL CHECK (btrim(module_id)<>''),
    content_version text NOT NULL CHECK (btrim(content_version)<>''),
    ordinal integer NOT NULL CHECK (ordinal>0),
    duration_minutes numeric NOT NULL CHECK (duration_minutes>0),
    price_vnd numeric NOT NULL CHECK (price_vnd>0),
    PRIMARY KEY (request_id,revision,module_id),
    UNIQUE (request_id,revision,ordinal),
    FOREIGN KEY (request_id,revision) REFERENCES platform.initial_pathway_revision
);
CREATE TABLE platform.initial_pathway_target (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    module_id text NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    instruction_level text NOT NULL CHECK (instruction_level IN ('FOUNDATIONAL','INTERMEDIATE','ADVANCED')),
    suitability_version text NOT NULL CHECK (btrim(suitability_version)<>''),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    PRIMARY KEY (request_id,revision,module_id,skill_id),
    FOREIGN KEY (request_id,revision,module_id) REFERENCES platform.initial_pathway_module
);
CREATE TABLE platform.initial_pathway_dependency (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    module_id text NOT NULL,
    dependent_skill_id text NOT NULL,
    prerequisite_skill_id text NOT NULL,
    provider_module_id text,
    gate_definition_id text NOT NULL CHECK (btrim(gate_definition_id)<>''),
    gate_version text NOT NULL CHECK (btrim(gate_version)<>''),
    internal_gate_id text,
    PRIMARY KEY (request_id,revision,module_id,dependent_skill_id,prerequisite_skill_id),
    FOREIGN KEY (request_id,revision,module_id) REFERENCES platform.initial_pathway_module,
    FOREIGN KEY (request_id,revision,provider_module_id) REFERENCES platform.initial_pathway_module,
    CHECK (provider_module_id IS DISTINCT FROM module_id OR (internal_gate_id IS NOT NULL AND btrim(internal_gate_id)<>''))
);
CREATE TABLE platform.initial_pathway_override (
    override_id uuid PRIMARY KEY,
    request_id uuid NOT NULL,
    previous_revision bigint NOT NULL,
    next_revision bigint NOT NULL CHECK (next_revision=previous_revision+1),
    organization_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    assignment_id text NOT NULL,
    assignment_version text NOT NULL,
    action text NOT NULL CHECK (action IN ('INCLUDE','EXCLUDE')),
    module_id text NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (request_id,next_revision),
    FOREIGN KEY (request_id,previous_revision) REFERENCES platform.initial_pathway_revision,
    FOREIGN KEY (request_id,next_revision) REFERENCES platform.initial_pathway_revision,
    FOREIGN KEY (request_id,next_revision,organization_id) REFERENCES platform.initial_pathway_revision(request_id,revision,organization_id),
    FOREIGN KEY (expert_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.initial_pathway_approval (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    content_hash platform.content_hash NOT NULL,
    organization_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    assignment_id text NOT NULL,
    assignment_version text NOT NULL,
    confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (request_id,revision),
    FOREIGN KEY (request_id,revision,content_hash) REFERENCES platform.initial_pathway_revision(request_id,revision,content_hash),
    FOREIGN KEY (request_id,revision,organization_id) REFERENCES platform.initial_pathway_revision(request_id,revision,organization_id),
    FOREIGN KEY (expert_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.initial_pathway_current (
    request_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    current_revision bigint,
    review_status text NOT NULL DEFAULT 'NONE' CHECK (review_status IN ('NONE','AWAITING_EXPERT_REVIEW','APPROVED','STALE','ARCHIVED')),
    archived_at timestamptz,
    FOREIGN KEY (request_id,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.initial_pathway_request(request_id,organization_id,learner_id,selection_id,selection_revision),
    FOREIGN KEY (request_id,current_revision,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.initial_pathway_revision(request_id,revision,organization_id,learner_id,selection_id,selection_revision),
    CHECK (review_status NOT IN ('AWAITING_EXPERT_REVIEW','APPROVED') OR current_revision IS NOT NULL),
    CHECK ((review_status='ARCHIVED')=(archived_at IS NOT NULL))
);
CREATE UNIQUE INDEX initial_one_current ON platform.initial_pathway_current(organization_id,learner_id) WHERE archived_at IS NULL;
CREATE TABLE platform.initial_pathway_receipt (
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    operation text NOT NULL,
    resource text NOT NULL,
    retry_key text NOT NULL CHECK (length(retry_key) BETWEEN 1 AND 128),
    body_hash platform.content_hash NOT NULL,
    http_status integer NOT NULL CHECK (http_status BETWEEN 200 AND 299),
    response jsonb NOT NULL CHECK (jsonb_typeof(response)='object'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (organization_id,actor_id,operation,resource,retry_key),
    FOREIGN KEY (actor_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
DO $$
DECLARE name text;
BEGIN
    FOREACH name IN ARRAY ARRAY['initial_gap_snapshot','initial_pathway_run','initial_pathway_revision',
        'initial_pathway_module','initial_pathway_target','initial_pathway_dependency','initial_pathway_override',
        'initial_pathway_approval','initial_pathway_receipt'] LOOP
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON platform.%I FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation()', name || '_immutable',name);
    END LOOP;
END $$;
-- Mutable execution fields cannot rewrite the confirmed immutable input or erase the request.
CREATE FUNCTION platform.initial_request_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Confirmed requests cannot be deleted' USING ERRCODE='23514'; END IF;
    IF ROW(NEW.request_id,NEW.organization_id,NEW.learner_id,NEW.selection_id,NEW.selection_revision,
           NEW.gap_snapshot_id,NEW.planning_input_hash,NEW.algorithm_version,NEW.configuration_version,NEW.frozen_input,NEW.created_at)
       IS DISTINCT FROM
       ROW(OLD.request_id,OLD.organization_id,OLD.learner_id,OLD.selection_id,OLD.selection_revision,
           OLD.gap_snapshot_id,OLD.planning_input_hash,OLD.algorithm_version,OLD.configuration_version,OLD.frozen_input,OLD.created_at)
    THEN RAISE EXCEPTION 'Confirmed request input is immutable' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER initial_request_history_guard BEFORE UPDATE OR DELETE ON platform.initial_pathway_request
    FOR EACH ROW EXECUTE FUNCTION platform.initial_request_history_guard();
