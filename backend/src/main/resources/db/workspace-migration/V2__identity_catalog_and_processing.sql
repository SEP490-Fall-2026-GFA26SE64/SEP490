CREATE DOMAIN platform.unit_interval AS numeric
    CHECK (VALUE >= 0 AND VALUE <= 1);
CREATE DOMAIN platform.positive_weight AS numeric
    CHECK (VALUE > 0 AND VALUE <= 1);
CREATE DOMAIN platform.content_hash AS text
    CHECK (VALUE ~ '^[0-9a-f]{64}$');

CREATE TABLE platform.organizational_unit (
    unit_id uuid PRIMARY KEY,
    parent_unit_id uuid REFERENCES platform.organizational_unit,
    name text NOT NULL CHECK (btrim(name) <> ''),
    CHECK (parent_unit_id <> unit_id)
);
CREATE INDEX organizational_unit_parent_idx ON platform.organizational_unit(parent_unit_id);

CREATE TABLE platform.account (
    account_id uuid PRIMARY KEY,
    unit_id uuid REFERENCES platform.organizational_unit,
    identifier text NOT NULL,
    normalized_identifier text NOT NULL UNIQUE CHECK (normalized_identifier = lower(btrim(identifier)) AND normalized_identifier <> ''),
    password_hash text NOT NULL CHECK (password_hash <> ''),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_unit_idx ON platform.account(unit_id);
CREATE TABLE platform.application_role (
    role_code text PRIMARY KEY CHECK (role_code IN ('LEARNER', 'LD_MANAGER', 'ADMINISTRATOR'))
);
INSERT INTO platform.application_role VALUES ('LEARNER'), ('LD_MANAGER'), ('ADMINISTRATOR');
CREATE TABLE platform.account_role (
    account_id uuid NOT NULL REFERENCES platform.account,
    role_code text NOT NULL REFERENCES platform.application_role,
    PRIMARY KEY (account_id, role_code)
);
CREATE TABLE platform.manager_scope (
    manager_id uuid NOT NULL REFERENCES platform.account,
    unit_id uuid NOT NULL REFERENCES platform.organizational_unit,
    PRIMARY KEY (manager_id, unit_id)
);
CREATE TABLE platform.session (
    session_id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES platform.account,
    token_hash platform.content_hash NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    CHECK (expires_at > created_at)
);
CREATE INDEX session_account_idx ON platform.session(account_id);
CREATE TABLE platform.learner_state (
    learner_id uuid PRIMARY KEY REFERENCES platform.account,
    submission_sequence bigint NOT NULL DEFAULT 0 CHECK (submission_sequence >= 0),
    profile_revision bigint NOT NULL DEFAULT 0 CHECK (profile_revision >= 0),
    progress_revision bigint NOT NULL DEFAULT 0 CHECK (progress_revision >= 0),
    target_revision bigint NOT NULL DEFAULT 0 CHECK (target_revision >= 0)
);

CREATE TABLE platform.catalog_guard (
    guard_id integer PRIMARY KEY CHECK (guard_id = 1),
    state text NOT NULL CHECK (state IN ('BLOCKED', 'OPEN')),
    intent_id uuid,
    release_id uuid,
    source_revision bigint NOT NULL DEFAULT 0 CHECK (source_revision >= 0),
    availability_revision bigint NOT NULL DEFAULT 0 CHECK (availability_revision >= 0),
    manifest_hash platform.content_hash,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (state <> 'OPEN' OR (release_id IS NOT NULL AND manifest_hash IS NOT NULL))
);
INSERT INTO platform.catalog_guard(guard_id, state) VALUES (1, 'BLOCKED');
CREATE TABLE platform.catalog_release (
    release_id uuid PRIMARY KEY,
    source_revision bigint NOT NULL UNIQUE CHECK (source_revision > 0),
    manifest_hash platform.content_hash NOT NULL,
    source_event_id uuid NOT NULL UNIQUE,
    confirmed_at timestamptz NOT NULL
);
CREATE TABLE platform.catalog_reference (
    catalog_ref_id uuid PRIMARY KEY,
    entity_id uuid NOT NULL,
    version_id uuid NOT NULL,
    release_id uuid NOT NULL REFERENCES platform.catalog_release,
    kind text NOT NULL CHECK (kind IN ('JOB_DOMAIN', 'TARGET_ROLE', 'MACRO_COMPETENCY', 'MICRO_SKILL', 'LEARNING_MODULE')),
    source_hash platform.content_hash NOT NULL,
    confirmed_at timestamptz NOT NULL,
    UNIQUE (entity_id, version_id, release_id, kind),
    UNIQUE (catalog_ref_id, kind),
    UNIQUE (catalog_ref_id, release_id)
);
CREATE INDEX catalog_reference_release_idx ON platform.catalog_reference(release_id);
CREATE TABLE platform.target_selection (
    selection_id uuid PRIMARY KEY,
    learner_id uuid NOT NULL REFERENCES platform.learner_state,
    role_ref_id uuid NOT NULL,
    role_kind text NOT NULL DEFAULT 'TARGET_ROLE' CHECK (role_kind = 'TARGET_ROLE'),
    selected_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    FOREIGN KEY (role_ref_id, role_kind) REFERENCES platform.catalog_reference(catalog_ref_id, kind),
    UNIQUE (selection_id, learner_id),
    CHECK (ended_at IS NULL OR ended_at >= selected_at)
);
CREATE UNIQUE INDEX one_active_target_per_learner ON platform.target_selection(learner_id) WHERE ended_at IS NULL;

CREATE TABLE platform.outbox_event (
    event_id uuid PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    source_revision bigint NOT NULL CHECK (source_revision >= 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    correlation_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    delivered_at timestamptz,
    UNIQUE (event_type, aggregate_id, source_revision)
);
CREATE INDEX outbox_undelivered_idx ON platform.outbox_event(created_at) WHERE delivered_at IS NULL;
CREATE TABLE platform.processing_job (
    job_id uuid PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES platform.outbox_event,
    handler text NOT NULL,
    learner_id uuid REFERENCES platform.learner_state,
    submission_sequence bigint CHECK (submission_sequence > 0),
    predecessor_job_id uuid REFERENCES platform.processing_job,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'RETRY', 'FAILED', 'BLOCKED')),
    lease_owner text,
    lease_expires_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_retry_at timestamptz NOT NULL DEFAULT now(),
    failure_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, handler),
    CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL)),
    CHECK (status <> 'RUNNING' OR lease_owner IS NOT NULL),
    CHECK (predecessor_job_id <> job_id),
    CHECK (submission_sequence IS NULL OR learner_id IS NOT NULL)
);
CREATE INDEX processing_job_ready_idx ON platform.processing_job(next_retry_at, created_at) WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX processing_job_lease_idx ON platform.processing_job(lease_expires_at) WHERE status = 'RUNNING';
CREATE INDEX processing_job_order_idx ON platform.processing_job(learner_id, submission_sequence);
CREATE TABLE platform.processing_receipt (
    event_id uuid NOT NULL,
    handler text NOT NULL,
    source_revision bigint NOT NULL CHECK (source_revision >= 0),
    applied_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, handler)
);
CREATE TABLE platform.audit_event (
    audit_event_id uuid PRIMARY KEY,
    actor_id uuid REFERENCES platform.account,
    service_name text,
    action text NOT NULL,
    resource_id uuid NOT NULL,
    resource_revision text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    outcome text NOT NULL,
    correlation_id uuid NOT NULL,
    CHECK (actor_id IS NOT NULL OR service_name IS NOT NULL)
);
CREATE INDEX audit_resource_idx ON platform.audit_event(resource_id, occurred_at);
CREATE FUNCTION platform.reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Historical records cannot be updated or deleted' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON platform.audit_event
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();