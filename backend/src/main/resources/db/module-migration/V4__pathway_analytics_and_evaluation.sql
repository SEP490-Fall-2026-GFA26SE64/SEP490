CREATE TABLE platform.recommendation_version (
    recommendation_version_id uuid PRIMARY KEY,
    algorithm text NOT NULL,
    version text NOT NULL,
    contract_version text NOT NULL,
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
    artifact_hash platform.content_hash NOT NULL,
    approved_by uuid REFERENCES platform.account,
    approved_at timestamptz,
    UNIQUE (algorithm, version),
    CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);
CREATE TABLE platform.recommendation_run (
    recommendation_run_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    profile_revision_id uuid NOT NULL,
    progress_revision_id uuid NOT NULL,
    catalog_release_id uuid NOT NULL REFERENCES platform.catalog_release,
    availability_revision bigint NOT NULL CHECK (availability_revision >= 0),
    policy_version_id uuid NOT NULL REFERENCES platform.evidence_policy_version,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    recommendation_version_id uuid NOT NULL REFERENCES platform.recommendation_version,
    seed bigint NOT NULL,
    input_hash platform.content_hash NOT NULL,
    frozen_input jsonb NOT NULL CHECK (jsonb_typeof(frozen_input) = 'object'),
    status text NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED')),
    unresolved_skills jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(unresolved_skills) = 'array'),
    failure_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (selection_id, learner_id) REFERENCES platform.target_selection(selection_id, learner_id),
    FOREIGN KEY (profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id),
    FOREIGN KEY (progress_revision_id, learner_id) REFERENCES platform.progress_revision(progress_revision_id, learner_id),
    UNIQUE (recommendation_run_id, learner_id, selection_id)
);
CREATE TABLE platform.recommendation_candidate (
    recommendation_run_id uuid NOT NULL REFERENCES platform.recommendation_run,
    rank integer NOT NULL CHECK (rank BETWEEN 1 AND 5),
    module_ref_id uuid NOT NULL,
    module_kind text NOT NULL DEFAULT 'LEARNING_MODULE' CHECK (module_kind = 'LEARNING_MODULE'),
    explanation jsonb NOT NULL CHECK (jsonb_typeof(explanation) = 'object'),
    PRIMARY KEY (recommendation_run_id, rank),
    UNIQUE (recommendation_run_id, module_ref_id),
    FOREIGN KEY (module_ref_id, module_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind)
);
CREATE TABLE platform.pathway_revision (
    pathway_revision_id uuid PRIMARY KEY,
    pathway_id uuid NOT NULL,
    recommendation_run_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    content_hash platform.content_hash NOT NULL,
    status text NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED_CURRENT', 'SUPERSEDED')),
    validation_status text NOT NULL DEFAULT 'UNVALIDATED' CHECK (validation_status IN ('UNVALIDATED', 'VALID', 'STALE', 'BLOCKED', 'UNRESOLVED')),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (recommendation_run_id, learner_id, selection_id) REFERENCES platform.recommendation_run(recommendation_run_id, learner_id, selection_id),
    UNIQUE (pathway_id, revision),
    UNIQUE (pathway_revision_id, learner_id),
    UNIQUE (pathway_revision_id, content_hash),
    CHECK (status <> 'PUBLISHED_CURRENT' OR (published_at IS NOT NULL AND validation_status = 'VALID'))
);
CREATE UNIQUE INDEX one_current_pathway_per_learner ON platform.pathway_revision(learner_id) WHERE status = 'PUBLISHED_CURRENT';
CREATE TABLE platform.pathway_step (
    step_id uuid PRIMARY KEY,
    pathway_revision_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    activity_id uuid NOT NULL,
    ordinal integer NOT NULL CHECK (ordinal > 0),
    required boolean NOT NULL,
    rationale jsonb NOT NULL,
    FOREIGN KEY (pathway_revision_id, learner_id) REFERENCES platform.pathway_revision(pathway_revision_id, learner_id),
    FOREIGN KEY (activity_id, learner_id) REFERENCES platform.learning_activity(activity_id, learner_id),
    UNIQUE (pathway_revision_id, ordinal),
    UNIQUE (pathway_revision_id, activity_id)
);
CREATE TABLE platform.pathway_approval (
    approval_id uuid PRIMARY KEY,
    pathway_revision_id uuid NOT NULL UNIQUE,
    administrator_id uuid NOT NULL REFERENCES platform.account,
    approved_hash platform.content_hash NOT NULL,
    approved_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (pathway_revision_id, approved_hash) REFERENCES platform.pathway_revision(pathway_revision_id, content_hash)
);
CREATE TABLE platform.publication_request (
    publication_request_id uuid PRIMARY KEY,
    actor_id uuid NOT NULL REFERENCES platform.account,
    pathway_revision_id uuid NOT NULL REFERENCES platform.pathway_revision,
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    request_hash platform.content_hash NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'REJECTED')),
    outcome_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (actor_id, idempotency_key)
);
CREATE FUNCTION platform.validate_pathway_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('APPROVED', 'PUBLISHED_CURRENT') AND NOT EXISTS (
        SELECT 1 FROM platform.pathway_approval approval
        WHERE approval.pathway_revision_id = NEW.pathway_revision_id AND approval.approved_hash = NEW.content_hash
    ) THEN
        RAISE EXCEPTION 'Exact revision approval is required' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER pathway_requires_approval BEFORE INSERT OR UPDATE ON platform.pathway_revision
    FOR EACH ROW EXECUTE FUNCTION platform.validate_pathway_approval();

CREATE TABLE platform.cohort_snapshot (
    cohort_snapshot_id uuid PRIMARY KEY,
    created_by uuid NOT NULL REFERENCES platform.account,
    role_ref_id uuid NOT NULL,
    role_kind text NOT NULL DEFAULT 'TARGET_ROLE' CHECK (role_kind = 'TARGET_ROLE'),
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
    definition_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (role_ref_id, role_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    CHECK (period_end > period_start)
);
CREATE TABLE platform.cohort_member (
    cohort_snapshot_id uuid NOT NULL REFERENCES platform.cohort_snapshot,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    before_profile_revision_id uuid,
    after_profile_revision_id uuid,
    exclusion_reason text,
    PRIMARY KEY (cohort_snapshot_id, learner_id),
    FOREIGN KEY (before_profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id),
    FOREIGN KEY (after_profile_revision_id, learner_id) REFERENCES platform.profile_revision(profile_revision_id, learner_id)
);
CREATE TABLE platform.analytics_snapshot (
    analytics_snapshot_id uuid PRIMARY KEY,
    cohort_snapshot_id uuid NOT NULL REFERENCES platform.cohort_snapshot,
    metric_version text NOT NULL,
    privacy_policy_version text NOT NULL,
    results jsonb NOT NULL CHECK (jsonb_typeof(results) = 'object'),
    result_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform.roi_scenario (
    scenario_id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES platform.account,
    cohort_snapshot_id uuid NOT NULL REFERENCES platform.cohort_snapshot,
    period_start date NOT NULL,
    period_end date NOT NULL,
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    cost numeric NOT NULL CHECK (cost > 0 AND cost < 'Infinity'::numeric),
    benefit numeric CHECK (benefit >= 0 AND benefit < 'Infinity'::numeric),
    assumptions jsonb NOT NULL,
    sources jsonb NOT NULL,
    calculation_version text NOT NULL,
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    CHECK (period_end > period_start)
);
CREATE INDEX roi_owner_idx ON platform.roi_scenario(owner_id);
CREATE TABLE platform.evaluation_run (
    evaluation_run_id uuid PRIMARY KEY,
    created_by uuid NOT NULL REFERENCES platform.account,
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    request_hash platform.content_hash NOT NULL,
    dataset_version text NOT NULL,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    recommendation_version_id uuid NOT NULL REFERENCES platform.recommendation_version,
    catalog_release_id uuid NOT NULL REFERENCES platform.catalog_release,
    baseline_version text NOT NULL,
    seed bigint NOT NULL,
    environment jsonb NOT NULL CHECK (jsonb_typeof(environment) = 'object'),
    frozen_manifest jsonb NOT NULL CHECK (jsonb_typeof(frozen_manifest) = 'object'),
    status text NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (created_by, idempotency_key)
);
CREATE TABLE platform.evaluation_artifact (
    artifact_id uuid PRIMARY KEY,
    evaluation_run_id uuid NOT NULL REFERENCES platform.evaluation_run,
    artifact_kind text NOT NULL,
    relative_path text NOT NULL CHECK (relative_path !~ '(^[/\\]|(^|/)\.\.(/|$)|:)'),
    content_hash platform.content_hash NOT NULL,
    byte_size bigint NOT NULL CHECK (byte_size >= 0),
    UNIQUE (evaluation_run_id, relative_path)
);
DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['catalog_release', 'catalog_reference', 'pathway_approval',
        'pathway_step', 'recommendation_candidate', 'cohort_snapshot', 'cohort_member',
        'analytics_snapshot', 'evaluation_artifact', 'processing_receipt']
    LOOP
        EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON platform.%I FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation()', table_name);
    END LOOP;
END;
$$;