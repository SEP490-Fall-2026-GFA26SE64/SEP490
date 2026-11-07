-- Atomic multi-module Expert selections reuse immutable override history.
ALTER TABLE platform.initial_pathway_override
    DROP CONSTRAINT initial_pathway_override_request_id_next_revision_key;
ALTER TABLE platform.initial_pathway_override
    ADD CONSTRAINT initial_pathway_override_revision_module_key UNIQUE(request_id,next_revision,module_id);
-- Price is no longer part of newly authored module documents. Historic documents remain readable.
ALTER TABLE platform.module_authoring
    ADD CONSTRAINT module_authoring_no_price CHECK
    (NOT jsonb_path_exists(document, '$.revisions[*].payload.price')) NOT VALID;
CREATE TABLE platform.development_module_seed_release (
    organization_id uuid NOT NULL REFERENCES platform.organization(organization_id),
    manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[0-9a-f]{64}$'),
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(organization_id,manifest_hash)
);
