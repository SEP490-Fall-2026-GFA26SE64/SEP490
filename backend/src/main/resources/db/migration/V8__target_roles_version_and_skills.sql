-- Migration V8: Add skill_targets to target_role and update uniqueness to (organization_id, code, version)
ALTER TABLE platform.target_role ADD COLUMN IF NOT EXISTS skill_targets text NOT NULL DEFAULT '[]';

-- Update unique constraint to allow multiple versions of the same role code within an organization
ALTER TABLE platform.target_role DROP CONSTRAINT IF EXISTS target_role_org_code_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'target_role_org_code_version_key'
    ) THEN
        ALTER TABLE platform.target_role ADD CONSTRAINT target_role_org_code_version_key UNIQUE (organization_id, code, version);
    END IF;
END $$;
