-- Explicit, per-module adoption. A shared graph identity can have only one workflow owner.
CREATE TABLE platform.module_catalog_intake (
    module_id text PRIMARY KEY,
    organization_id text NOT NULL,
    document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object')
);
CREATE INDEX module_catalog_intake_organization ON platform.module_catalog_intake(organization_id);
COMMENT ON TABLE platform.module_catalog_intake IS 'L&D occupation assignment and exact source catalog snapshot; Expert acceptance is separate from unknown original authorship.';
