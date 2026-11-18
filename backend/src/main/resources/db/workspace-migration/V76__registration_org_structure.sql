-- Organization structure (Department -> Job position -> Target role -> Level) imported by the Guest during registration.
-- Replaces the platform starter-catalog selection; platform.registration_catalog_selection is retained but no longer written.
CREATE TABLE platform.registration_org_structure (
    registration_id uuid PRIMARY KEY REFERENCES platform.organization_registration(registration_id) ON DELETE CASCADE,
    structure jsonb NOT NULL CHECK (jsonb_typeof(structure) = 'object'),
    node_count integer NOT NULL CHECK (node_count >= 4),
    relationship_count integer NOT NULL CHECK (relationship_count >= 3),
    created_at timestamptz NOT NULL
);
