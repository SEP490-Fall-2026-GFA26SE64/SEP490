CREATE TABLE platform.evidence_policy_version (
    policy_version_id uuid PRIMARY KEY,
    policy_name text NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
    configuration_hash platform.content_hash NOT NULL,
    approved_by uuid REFERENCES platform.account,
    approved_at timestamptz,
    UNIQUE (policy_name, version),
    CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);
CREATE TABLE platform.model_version (
    model_version_id uuid PRIMARY KEY,
    algorithm text NOT NULL,
    version text NOT NULL,
    parameter_hash platform.content_hash NOT NULL,
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
    artifact_ref text NOT NULL,
    approved_by uuid REFERENCES platform.account,
    approved_at timestamptz,
    UNIQUE (algorithm, version),
    CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);
CREATE TABLE platform.question_bank (
    question_bank_id uuid PRIMARY KEY,
    name text NOT NULL,
    created_by uuid NOT NULL REFERENCES platform.account,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform.item_version (
    item_version_id uuid PRIMARY KEY,
    item_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    question_bank_id uuid NOT NULL REFERENCES platform.question_bank,
    prompt text NOT NULL,
    response_schema jsonb NOT NULL CHECK (jsonb_typeof(response_schema) = 'object'),
    protected_key jsonb NOT NULL,
    publication_state text NOT NULL DEFAULT 'DRAFT' CHECK (publication_state IN ('DRAFT', 'PUBLISHED')),
    content_hash platform.content_hash NOT NULL,
    UNIQUE (item_id, version)
);
CREATE TABLE platform.assessment_version (
    assessment_version_id uuid PRIMARY KEY,
    assessment_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    title text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE', 'MODULE')),
    pass_threshold platform.unit_interval NOT NULL,
    scoring_version text NOT NULL,
    publication_state text NOT NULL DEFAULT 'DRAFT' CHECK (publication_state IN ('DRAFT', 'PUBLISHED')),
    content_hash platform.content_hash NOT NULL,
    UNIQUE (assessment_id, version),
    UNIQUE (assessment_version_id, purpose)
);
CREATE TABLE platform.assessment_availability (
    assessment_version_id uuid NOT NULL REFERENCES platform.assessment_version,
    revision bigint NOT NULL CHECK (revision > 0),
    available boolean NOT NULL,
    decided_by uuid NOT NULL REFERENCES platform.account,
    decided_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (assessment_version_id, revision)
);
CREATE TABLE platform.assessment_item (
    assessment_version_id uuid NOT NULL REFERENCES platform.assessment_version,
    item_position integer NOT NULL CHECK (item_position > 0),
    item_version_id uuid NOT NULL REFERENCES platform.item_version,
    required boolean NOT NULL,
    scoring_weight numeric NOT NULL CHECK (scoring_weight > 0 AND scoring_weight < 'Infinity'::numeric),
    PRIMARY KEY (assessment_version_id, item_position),
    UNIQUE (assessment_version_id, item_position, item_version_id)
);
CREATE TABLE platform.item_skill_mapping (
    mapping_version_id uuid PRIMARY KEY,
    item_version_id uuid NOT NULL REFERENCES platform.item_version,
    skill_ref_id uuid NOT NULL,
    skill_kind text NOT NULL DEFAULT 'MICRO_SKILL' CHECK (skill_kind = 'MICRO_SKILL'),
    evidence_weight platform.positive_weight NOT NULL,
    FOREIGN KEY (skill_ref_id, skill_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    UNIQUE (item_version_id, skill_ref_id),
    UNIQUE (mapping_version_id, item_version_id, skill_ref_id, evidence_weight)
);
CREATE TABLE platform.module_assessment_binding (
    module_ref_id uuid NOT NULL,
    module_kind text NOT NULL DEFAULT 'LEARNING_MODULE' CHECK (module_kind = 'LEARNING_MODULE'),
    assessment_version_id uuid NOT NULL,
    assessment_purpose text NOT NULL DEFAULT 'MODULE' CHECK (assessment_purpose = 'MODULE'),
    required boolean NOT NULL,
    manifest_hash platform.content_hash NOT NULL,
    FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    FOREIGN KEY (assessment_version_id, assessment_purpose) REFERENCES platform.assessment_version(assessment_version_id, purpose),
    PRIMARY KEY (module_ref_id, assessment_version_id),
    UNIQUE (module_ref_id, assessment_version_id, required, manifest_hash)
);
CREATE TABLE platform.learning_activity (
    activity_id uuid PRIMARY KEY CHECK (activity_id <> '00000000-0000-0000-0000-000000000000'::uuid),
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    module_ref_id uuid NOT NULL,
    module_kind text NOT NULL DEFAULT 'LEARNING_MODULE' CHECK (module_kind = 'LEARNING_MODULE'),
    kind text NOT NULL CHECK (kind IN ('PATHWAY', 'FOUNDATIONAL', 'REMEDIAL', 'RETRY')),
    required_assessment_set_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    UNIQUE (activity_id, learner_id),
    UNIQUE (activity_id, module_ref_id, required_assessment_set_hash)
);
CREATE TABLE platform.activity_requirement (
    activity_id uuid NOT NULL,
    module_ref_id uuid NOT NULL,
    assessment_version_id uuid NOT NULL,
    required boolean NOT NULL,
    manifest_hash platform.content_hash NOT NULL,
    PRIMARY KEY (activity_id, assessment_version_id),
    FOREIGN KEY (activity_id, module_ref_id, manifest_hash) REFERENCES platform.learning_activity(activity_id, module_ref_id, required_assessment_set_hash),
    FOREIGN KEY (module_ref_id, assessment_version_id, required, manifest_hash) REFERENCES platform.module_assessment_binding(module_ref_id, assessment_version_id, required, manifest_hash)
);
CREATE TABLE platform.assessment_assignment (
    assignment_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    assessment_version_id uuid NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE', 'MODULE')),
    activity_id uuid,
    activity_context uuid GENERATED ALWAYS AS (coalesce(activity_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
    available_from timestamptz NOT NULL,
    available_until timestamptz,
    attempt_limit integer NOT NULL CHECK (attempt_limit > 0),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED', 'CLOSED')),
    FOREIGN KEY (assessment_version_id, purpose) REFERENCES platform.assessment_version(assessment_version_id, purpose),
    FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id),
    FOREIGN KEY (activity_id, assessment_version_id) REFERENCES platform.activity_requirement(activity_id, assessment_version_id),
    UNIQUE (assignment_id, learner_id, assessment_version_id, activity_context),
    CHECK ((purpose = 'BASELINE' AND activity_id IS NULL) OR (purpose = 'MODULE' AND activity_id IS NOT NULL)),
    CHECK (available_until IS NULL OR available_until > available_from)
);
CREATE INDEX assignment_learner_idx ON platform.assessment_assignment(learner_id, status);
CREATE TABLE platform.assessment_attempt (
    attempt_id uuid PRIMARY KEY,
    assignment_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    assessment_version_id uuid NOT NULL,
    activity_id uuid,
    activity_context uuid GENERATED ALWAYS AS (coalesce(activity_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
    operation text NOT NULL DEFAULT 'SUBMIT_ASSESSMENT' CHECK (operation = 'SUBMIT_ASSESSMENT'),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    request_hash platform.content_hash NOT NULL,
    frozen_context jsonb NOT NULL CHECK (jsonb_typeof(frozen_context) = 'object'),
    submission_sequence bigint NOT NULL CHECK (submission_sequence > 0),
    attempt_number integer NOT NULL CHECK (attempt_number > 0),
    accepted_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (assignment_id, learner_id, assessment_version_id, activity_context) REFERENCES platform.assessment_assignment(assignment_id, learner_id, assessment_version_id, activity_context),
    UNIQUE (learner_id, operation, idempotency_key),
    UNIQUE (learner_id, submission_sequence),
    UNIQUE (assignment_id, attempt_number),
    UNIQUE (attempt_id, assessment_version_id),
    UNIQUE (attempt_id, learner_id),
    UNIQUE (attempt_id, learner_id, assessment_version_id, activity_context)
);
CREATE TABLE platform.item_response (
    attempt_id uuid NOT NULL,
    item_position integer NOT NULL,
    assessment_version_id uuid NOT NULL,
    item_version_id uuid NOT NULL,
    response_payload jsonb NOT NULL,
    PRIMARY KEY (attempt_id, item_position),
    FOREIGN KEY (attempt_id, assessment_version_id) REFERENCES platform.assessment_attempt(attempt_id, assessment_version_id),
    FOREIGN KEY (assessment_version_id, item_position, item_version_id) REFERENCES platform.assessment_item(assessment_version_id, item_position, item_version_id),
    UNIQUE (attempt_id, item_position, item_version_id)
);
CREATE TABLE platform.assessment_result (
    attempt_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL,
    assessment_version_id uuid NOT NULL,
    activity_id uuid,
    activity_context uuid GENERATED ALWAYS AS (coalesce(activity_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
    score platform.unit_interval NOT NULL,
    pass_threshold platform.unit_interval NOT NULL,
    passed boolean GENERATED ALWAYS AS (score >= pass_threshold) STORED,
    scoring_version text NOT NULL,
    scored_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (attempt_id, learner_id, assessment_version_id, activity_context) REFERENCES platform.assessment_attempt(attempt_id, learner_id, assessment_version_id, activity_context),
    UNIQUE (attempt_id, learner_id, activity_id, assessment_version_id, passed)
);
CREATE TABLE platform.evidence_observation (
    observation_id uuid PRIMARY KEY,
    attempt_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    item_position integer NOT NULL,
    item_version_id uuid NOT NULL,
    mapping_version_id uuid NOT NULL,
    skill_ref_id uuid NOT NULL,
    outcome boolean NOT NULL,
    weight platform.positive_weight NOT NULL,
    source_kind text NOT NULL CHECK (source_kind = 'OBJECTIVE_ASSESSMENT'),
    FOREIGN KEY (attempt_id, item_position, item_version_id) REFERENCES platform.item_response(attempt_id, item_position, item_version_id),
    FOREIGN KEY (attempt_id, learner_id) REFERENCES platform.assessment_attempt(attempt_id, learner_id),
    FOREIGN KEY (mapping_version_id, item_version_id, skill_ref_id, weight) REFERENCES platform.item_skill_mapping(mapping_version_id, item_version_id, skill_ref_id, evidence_weight),
    UNIQUE (attempt_id, item_position, mapping_version_id),
    UNIQUE (observation_id, learner_id)
);
CREATE TABLE platform.processing_stream (
    processing_stream_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    policy_version_id uuid NOT NULL REFERENCES platform.evidence_policy_version,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (processing_stream_id, learner_id, model_version_id, policy_version_id)
);
CREATE TABLE platform.profile_revision (
    profile_revision_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL,
    processing_stream_id uuid NOT NULL,
    model_version_id uuid NOT NULL,
    policy_version_id uuid NOT NULL,
    revision_number bigint NOT NULL CHECK (revision_number > 0),
    evidence_watermark bigint NOT NULL CHECK (evidence_watermark >= 0),
    status text NOT NULL CHECK (status IN ('COMPLETE', 'PENDING', 'BLOCKED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (processing_stream_id, learner_id, model_version_id, policy_version_id) REFERENCES platform.processing_stream(processing_stream_id, learner_id, model_version_id, policy_version_id),
    UNIQUE (learner_id, revision_number),
    UNIQUE (profile_revision_id, learner_id),
    UNIQUE (profile_revision_id, learner_id, processing_stream_id)
);
CREATE TABLE platform.mastery_estimate (
    profile_revision_id uuid NOT NULL REFERENCES platform.profile_revision,
    skill_ref_id uuid NOT NULL,
    skill_kind text NOT NULL DEFAULT 'MICRO_SKILL' CHECK (skill_kind = 'MICRO_SKILL'),
    objective_value platform.unit_interval,
    provisional_value platform.unit_interval,
    effective_value platform.unit_interval,
    evidence_status text NOT NULL CHECK (evidence_status IN ('UNKNOWN', 'PROVISIONAL', 'OBJECTIVE')),
    PRIMARY KEY (profile_revision_id, skill_ref_id),
    FOREIGN KEY (skill_ref_id, skill_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    CHECK ((evidence_status = 'UNKNOWN' AND effective_value IS NULL AND objective_value IS NULL)
        OR (evidence_status = 'PROVISIONAL' AND effective_value IS NOT NULL AND provisional_value IS NOT NULL AND objective_value IS NULL)
        OR (evidence_status = 'OBJECTIVE' AND effective_value IS NOT NULL AND objective_value IS NOT NULL))
);
CREATE TABLE platform.evidence_application (
    processing_stream_id uuid NOT NULL,
    observation_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    profile_revision_id uuid NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (processing_stream_id, observation_id),
    FOREIGN KEY (observation_id, learner_id) REFERENCES platform.evidence_observation(observation_id, learner_id),
    FOREIGN KEY (profile_revision_id, learner_id, processing_stream_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id, processing_stream_id)
);
CREATE TABLE platform.progress_revision (
    progress_revision_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    revision_number bigint NOT NULL CHECK (revision_number > 0),
    activity_snapshot jsonb NOT NULL CHECK (jsonb_typeof(activity_snapshot) = 'array'),
    snapshot_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (learner_id, revision_number),
    UNIQUE (progress_revision_id, learner_id)
);
CREATE TABLE platform.module_completion (
    activity_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL,
    progress_revision_id uuid NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id),
    FOREIGN KEY (progress_revision_id, learner_id) REFERENCES platform.progress_revision(progress_revision_id, learner_id),
    UNIQUE (activity_id, learner_id)
);
CREATE TABLE platform.completion_pass (
    activity_id uuid NOT NULL,
    assessment_version_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    passed boolean NOT NULL DEFAULT true CHECK (passed),
    PRIMARY KEY (activity_id, assessment_version_id),
    FOREIGN KEY (activity_id, learner_id) REFERENCES platform.module_completion(activity_id, learner_id),
    FOREIGN KEY (activity_id, assessment_version_id) REFERENCES platform.activity_requirement(activity_id, assessment_version_id),
    FOREIGN KEY (attempt_id, learner_id, activity_id, assessment_version_id, passed) REFERENCES platform.assessment_result(attempt_id, learner_id, activity_id, assessment_version_id, passed)
);

CREATE FUNCTION platform.validate_completion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.activity_requirement WHERE activity_id = NEW.activity_id AND required)
        OR EXISTS (
            SELECT 1 FROM platform.activity_requirement requirement
            WHERE requirement.activity_id = NEW.activity_id AND requirement.required
            AND NOT EXISTS (SELECT 1 FROM platform.completion_pass accepted_pass
                WHERE accepted_pass.activity_id = requirement.activity_id
                AND accepted_pass.assessment_version_id = requirement.assessment_version_id)
        ) THEN
        RAISE EXCEPTION 'Completion requires every required assessment pass in this activity' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER complete_required_assessments AFTER INSERT ON platform.module_completion
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_completion();

CREATE FUNCTION platform.validate_scoring_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.assessment_version definition
        WHERE definition.assessment_version_id = NEW.assessment_version_id
        AND definition.pass_threshold = NEW.pass_threshold AND definition.scoring_version = NEW.scoring_version) THEN
        RAISE EXCEPTION 'Scoring context differs from pinned assessment' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER fixed_scoring_context BEFORE INSERT ON platform.assessment_result
    FOR EACH ROW EXECUTE FUNCTION platform.validate_scoring_context();

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['assessment_attempt', 'item_response', 'assessment_result',
        'evidence_observation', 'evidence_application', 'profile_revision', 'mastery_estimate',
        'processing_stream', 'progress_revision', 'module_completion', 'completion_pass',
        'learning_activity', 'activity_requirement', 'module_assessment_binding', 'assessment_availability']
    LOOP
        EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON platform.%I FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation()', table_name);
    END LOOP;
END;
$$;