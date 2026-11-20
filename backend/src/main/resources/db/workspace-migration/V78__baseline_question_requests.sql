CREATE TABLE platform.baseline_question_request (
    id uuid PRIMARY KEY, organization_id uuid NOT NULL, role_id text NOT NULL, role_name text NOT NULL,
    skill_id text NOT NULL, skill_name text NOT NULL, knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    skill_version text NOT NULL, recipient_id uuid NOT NULL, requested_by uuid NOT NULL,
    required_total integer NOT NULL CHECK (required_total BETWEEN 1 AND 500),
    required_mandatory integer NOT NULL CHECK (required_mandatory BETWEEN 0 AND required_total),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (organization_id,role_id,skill_id,knowledge_level,skill_version)
);
CREATE TABLE platform.baseline_question_request_item (
    request_id uuid NOT NULL REFERENCES platform.baseline_question_request(id), question_id uuid NOT NULL,
    linked_by uuid NOT NULL, linked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(request_id,question_id)
);
CREATE TABLE platform.skill_policy_bulk_template (
    organization_id uuid NOT NULL, actor_id uuid NOT NULL, configuration jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(organization_id,actor_id)
);
