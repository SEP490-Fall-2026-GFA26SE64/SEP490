-- Current string-ID catalog consumer. Legacy target_selection/profile history is not rewritten.
CREATE TABLE platform.employee_role_selection (
    selection_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL REFERENCES platform.learner_state(learner_id),
    role_id text NOT NULL CHECK (btrim(role_id)<>''),
    occupation_id text NOT NULL CHECK (btrim(occupation_id)<>''),
    role_snapshot jsonb NOT NULL CHECK (jsonb_typeof(role_snapshot)='object'),
    target_revision bigint NOT NULL CHECK (target_revision>0),
    selected_at timestamptz NOT NULL,
    ended_at timestamptz,
    UNIQUE(organization_id,learner_id,target_revision),
    CHECK (ended_at IS NULL OR ended_at>=selected_at)
);
CREATE UNIQUE INDEX employee_role_selection_current ON platform.employee_role_selection(organization_id,learner_id) WHERE ended_at IS NULL;
CREATE TABLE platform.employee_role_selection_request (
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    retry_key text NOT NULL,
    request_hash platform.content_hash NOT NULL,
    selection_id uuid NOT NULL REFERENCES platform.employee_role_selection(selection_id),
    response jsonb NOT NULL CHECK (jsonb_typeof(response)='object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(organization_id,learner_id,retry_key)
);
CREATE TRIGGER employee_role_request_immutable BEFORE UPDATE OR DELETE ON platform.employee_role_selection_request
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
-- Local profile-owner substitute: genuine initialized mastery, pinned to the completed baseline.
-- This is not a REQ-041 delivery receipt, nor an update to legacy processing streams.
CREATE TABLE platform.employee_occupation_profile (
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    occupation_id text NOT NULL,
    attempt_id uuid NOT NULL,
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL CHECK (blueprint_version>0),
    catalog_fingerprint text NOT NULL,
    required_skills jsonb NOT NULL CHECK (jsonb_typeof(required_skills)='array' AND jsonb_array_length(required_skills)>0),
    mastery jsonb NOT NULL CHECK (jsonb_typeof(mastery)='object' AND mastery<>'{}'::jsonb),
    initialized_at timestamptz NOT NULL,
    PRIMARY KEY(organization_id,learner_id,occupation_id),
    UNIQUE(attempt_id),
    FOREIGN KEY(attempt_id,organization_id,learner_id,occupation_id)
        REFERENCES platform.baseline_adaptive_attempt(attempt_id,organization_id,learner_id,occupation_id),
    FOREIGN KEY(blueprint_id,blueprint_version) REFERENCES platform.baseline_adaptive_blueprint_version(blueprint_id,version)
);
CREATE TRIGGER employee_occupation_profile_initial_immutable BEFORE UPDATE OR DELETE ON platform.employee_occupation_profile
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
