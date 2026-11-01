-- Own active catalog discovery no longer requires an unrelated department-reference record.
-- Existing non-null references/FKs and all resource/pin/history rows remain unchanged.
ALTER TABLE platform.workspace_baseline_resource
    ALTER COLUMN occupation_reference_id DROP NOT NULL;

COMMENT ON COLUMN platform.workspace_baseline_resource.occupation_reference_id IS
    'Non-null retains department-reference grant/activation checks; null is a baseline-owned binding whose active catalog ownership is revalidated against trusted organization context. Created only by explicit L&D resource configuration.';
