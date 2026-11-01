-- Authoring/workflow ownership is PostgreSQL; Neo4j remains the released catalog.
CREATE TABLE platform.module_authoring (
    organization_id text NOT NULL,
    module_id text NOT NULL,
    document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
    PRIMARY KEY (organization_id, module_id),
    UNIQUE (module_id)
);
CREATE TABLE platform.module_authoring_content (
    organization_id text NOT NULL,
    content_id text NOT NULL,
    document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
    PRIMARY KEY (organization_id, content_id)
);
CREATE TABLE platform.module_occupation_grant (
    organization_id text NOT NULL,
    expert_id text NOT NULL,
    occupation_id text NOT NULL,
    active boolean NOT NULL,
    PRIMARY KEY (organization_id, expert_id, occupation_id)
);
CREATE TABLE platform.module_grant_audit (
    event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id text NOT NULL,
    expert_id text NOT NULL,
    occupation_id text NOT NULL,
    active boolean NOT NULL,
    changed_by text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform.module_learning_pin (
    organization_id text NOT NULL,
    learner_id text NOT NULL,
    module_id text NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    started_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, learner_id, module_id),
    FOREIGN KEY (organization_id, module_id) REFERENCES platform.module_authoring(organization_id, module_id)
);
COMMENT ON TABLE platform.module_authoring IS
    'Locked authoring aggregate: creator, immutable payload revisions, edit/decision events and durable retryable publication state. Never a learner mastery store.';
