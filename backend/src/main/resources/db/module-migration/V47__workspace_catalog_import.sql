-- Platform catalog items chosen during registration, and the per-organization copy job run after provisioning.
CREATE TABLE platform.registration_catalog_selection (
    registration_id uuid PRIMARY KEY REFERENCES platform.organization_registration(registration_id) ON DELETE CASCADE,
    template_version text NOT NULL CHECK (length(template_version) BETWEEN 1 AND 64),
    template_sha256 text NOT NULL CHECK (template_sha256 ~ '^[0-9a-f]{64}$'),
    selected_node_ids text[] NOT NULL CHECK (cardinality(selected_node_ids) BETWEEN 1 AND 300),
    created_at timestamptz NOT NULL
);

CREATE TABLE platform.workspace_catalog_import (
    organization_id uuid PRIMARY KEY REFERENCES platform.organization(organization_id),
    registration_id uuid NOT NULL UNIQUE REFERENCES platform.organization_registration(registration_id),
    state text NOT NULL CHECK (state IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at timestamptz NOT NULL,
    lease_owner uuid,
    lease_until timestamptz,
    template_version text,
    template_sha256 text CHECK (template_sha256 IS NULL OR template_sha256 ~ '^[0-9a-f]{64}$'),
    node_count integer CHECK (node_count IS NULL OR node_count >= 0),
    relationship_count integer CHECK (relationship_count IS NULL OR relationship_count >= 0),
    failure_code text,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    completed_at timestamptz,
    CHECK ((state = 'SUCCEEDED') = (completed_at IS NOT NULL))
);

CREATE INDEX workspace_catalog_import_due ON platform.workspace_catalog_import (next_attempt_at) WHERE state = 'PENDING';
