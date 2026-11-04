-- V48: Refactor Occupation to Job Position across relational catalog and baseline models

-- 1. Rename tables
ALTER TABLE IF EXISTS platform.occupation_department_reference
    RENAME TO job_position_department_reference;

ALTER TABLE IF EXISTS platform.module_occupation_grant
    RENAME TO module_job_position_grant;

ALTER TABLE IF EXISTS platform.employee_occupation_profile
    RENAME TO employee_job_position_profile;

-- 2. Rename columns in job_position_department_reference
ALTER TABLE IF EXISTS platform.job_position_department_reference
    RENAME COLUMN occupation_reference_id TO job_position_reference_id;

ALTER TABLE IF EXISTS platform.job_position_department_reference
    RENAME COLUMN occupation_id TO job_position_id;

-- 3. Rename columns in module_job_position_grant
ALTER TABLE IF EXISTS platform.module_job_position_grant
    RENAME COLUMN occupation_id TO job_position_id;

-- 4. Rename columns in employee_job_position_profile
ALTER TABLE IF EXISTS platform.employee_job_position_profile
    RENAME COLUMN occupation_id TO job_position_id;

-- 5. Rename columns in organization_membership
ALTER TABLE IF EXISTS platform.organization_membership
    RENAME COLUMN occupation_reference_id TO job_position_reference_id;

-- 6. Rename columns in workspace_activation
ALTER TABLE IF EXISTS platform.workspace_activation
    RENAME COLUMN occupation_reference_id TO job_position_reference_id;

-- 7. Rename columns in workspace_baseline_resource
ALTER TABLE IF EXISTS platform.workspace_baseline_resource
    RENAME COLUMN occupation_reference_id TO job_position_reference_id;

ALTER TABLE IF EXISTS platform.workspace_baseline_resource
    RENAME COLUMN graph_occupation_id TO graph_job_position_id;

-- 8. Rename columns in baseline adaptive blueprint version
ALTER TABLE IF EXISTS platform.baseline_adaptive_blueprint_version
    RENAME COLUMN occupation_max_questions TO job_position_max_questions;

ALTER TABLE IF EXISTS platform.baseline_adaptive_blueprint_version
    RENAME COLUMN occupation_time_limit_seconds TO job_position_time_limit_seconds;

ALTER TABLE IF EXISTS platform.baseline_adaptive_blueprint_version
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_adaptive_blueprint_version
    RENAME COLUMN occupation_name_snapshot TO job_position_name_snapshot;

-- 9. Rename columns in baseline blueprint tables
ALTER TABLE IF EXISTS platform.baseline_blueprint
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_blueprint_version
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_blueprint_version
    RENAME COLUMN occupation_name_snapshot TO job_position_name_snapshot;

ALTER TABLE IF EXISTS platform.baseline_blueprint_working_revision
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_blueprint_working_revision
    RENAME COLUMN occupation_name_snapshot TO job_position_name_snapshot;

ALTER TABLE IF EXISTS platform.baseline_blueprint_command
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_blueprint_activation
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_blueprint_activation_event
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_adaptive_blueprint_working_revision
    RENAME COLUMN occupation_id TO job_position_id;

-- 10. Rename columns in baseline attempt tables
ALTER TABLE IF EXISTS platform.baseline_adaptive_attempt
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_attempt_command
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_assessment_series
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_assessment_transition
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_management_command
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.baseline_mastery_evidence
    RENAME COLUMN occupation_id TO job_position_id;

-- 11. Rename columns in grants and selections
ALTER TABLE IF EXISTS platform.module_grant_audit
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.employee_role_selection
    RENAME COLUMN occupation_id TO job_position_id;

ALTER TABLE IF EXISTS platform.initial_gap_snapshot
    RENAME COLUMN occupation_id TO job_position_id;

-- 12. Update constraints and indexes
ALTER TABLE IF EXISTS platform.baseline_blueprint_version
    DROP CONSTRAINT IF EXISTS baseline_blueprint_version_check;

ALTER TABLE IF EXISTS platform.baseline_blueprint_version
    ADD CONSTRAINT baseline_blueprint_version_check
    CHECK (job_position_id IS NULL AND job_position_name_snapshot IS NULL OR job_position_id IS NOT NULL AND btrim(job_position_id) <> ''::text AND job_position_name_snapshot IS NOT NULL AND btrim(job_position_name_snapshot) <> ''::text);

DROP INDEX IF EXISTS platform.baseline_blueprint_organization_occupation_unique;
DROP INDEX IF EXISTS platform.baseline_blueprint_organization_job_position_unique;
CREATE UNIQUE INDEX IF NOT EXISTS baseline_blueprint_organization_job_position_unique
    ON platform.baseline_blueprint (organization_id, job_position_id)
    WHERE organization_id IS NOT NULL AND job_position_id IS NOT NULL;

-- 13. Update trigger function for blueprint identity
CREATE OR REPLACE FUNCTION platform.validate_baseline_blueprint_job_position_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    identity_record record;
    creator_organization_id uuid;
BEGIN
    SELECT identity.job_position_id, identity.organization_id
    INTO identity_record
    FROM platform.baseline_blueprint identity
    WHERE identity.blueprint_id = NEW.blueprint_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Baseline blueprint identity is missing'
            USING ERRCODE = '23503';
    END IF;

    IF identity_record.job_position_id IS DISTINCT FROM NEW.job_position_id THEN
        RAISE EXCEPTION 'Blueprint version job position does not match its logical identity'
            USING ERRCODE = '23514';
    END IF;

    SELECT organization_id INTO creator_organization_id
    FROM platform.account
    WHERE account_id = NEW.created_by;

    IF identity_record.organization_id IS DISTINCT FROM creator_organization_id THEN
        RAISE EXCEPTION 'Blueprint version creator is outside the blueprint organization'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS baseline_blueprint_occupation_identity ON platform.baseline_blueprint_version;
DROP TRIGGER IF EXISTS baseline_blueprint_job_position_identity ON platform.baseline_blueprint_version;
CREATE TRIGGER baseline_blueprint_job_position_identity
    BEFORE INSERT OR UPDATE ON platform.baseline_blueprint_version
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_blueprint_job_position_identity();
