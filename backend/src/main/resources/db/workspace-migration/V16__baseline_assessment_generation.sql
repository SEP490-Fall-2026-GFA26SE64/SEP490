ALTER TABLE platform.assessment_version
    ALTER COLUMN pass_threshold DROP NOT NULL,
    ADD COLUMN blueprint_id uuid,
    ADD COLUMN blueprint_version integer,
    ADD COLUMN generation_seed bigint,
    ADD COLUMN created_by uuid REFERENCES platform.account,
    ADD COLUMN created_at timestamptz,
    ADD COLUMN generation_idempotency_key text,
    ADD COLUMN generation_request_hash platform.content_hash,
    ADD CONSTRAINT assessment_version_threshold_by_purpose
        CHECK (purpose = 'BASELINE' OR pass_threshold IS NOT NULL),
    ADD CONSTRAINT assessment_version_blueprint_fk
        FOREIGN KEY (blueprint_id, blueprint_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    ADD CONSTRAINT assessment_version_generation_metadata_complete
        CHECK (
            (blueprint_id IS NULL
                AND blueprint_version IS NULL
                AND generation_seed IS NULL
                AND created_by IS NULL
                AND created_at IS NULL
                AND generation_idempotency_key IS NULL
                AND generation_request_hash IS NULL)
            OR
            (purpose = 'BASELINE'
                AND blueprint_id IS NOT NULL
                AND blueprint_version IS NOT NULL
                AND generation_seed IS NOT NULL
                AND created_by IS NOT NULL
                AND created_at IS NOT NULL
                AND generation_idempotency_key IS NOT NULL
                AND btrim(generation_idempotency_key) <> ''
                AND generation_request_hash IS NOT NULL)
        );

CREATE UNIQUE INDEX assessment_version_generation_request_unique
    ON platform.assessment_version(created_by, generation_idempotency_key)
    WHERE generation_idempotency_key IS NOT NULL;

ALTER TABLE platform.assessment_item
    DROP CONSTRAINT assessment_item_scoring_weight_check,
    ADD COLUMN role_id text,
    ADD COLUMN role_name_snapshot text,
    ADD CONSTRAINT assessment_item_scoring_weight_check
        CHECK (scoring_weight >= 0 AND scoring_weight < 'Infinity'::numeric),
    ADD CONSTRAINT assessment_item_role_snapshot_complete
        CHECK (
            (role_id IS NULL AND role_name_snapshot IS NULL)
            OR
            (role_id IS NOT NULL AND btrim(role_id) <> ''
                AND role_name_snapshot IS NOT NULL AND btrim(role_name_snapshot) <> '')
        );

CREATE FUNCTION platform.validate_assessment_item_generation_context()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    definition record;
BEGIN
    SELECT purpose, blueprint_id, blueprint_version
    INTO definition
    FROM platform.assessment_version
    WHERE assessment_version_id = NEW.assessment_version_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF definition.blueprint_id IS NULL THEN
        IF NEW.role_id IS NOT NULL OR NEW.scoring_weight <= 0 THEN
            RAISE EXCEPTION 'Legacy and module assessment items require positive weight and no blueprint role'
                USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;

    IF definition.purpose <> 'BASELINE'
        OR NEW.role_id IS NULL
        OR NOT EXISTS (
            SELECT 1
            FROM platform.baseline_blueprint_role role
            JOIN platform.baseline_blueprint_skill skill
              ON skill.blueprint_id = role.blueprint_id
             AND skill.blueprint_version = role.blueprint_version
             AND skill.role_id = role.role_id
            JOIN platform.item_version item
              ON item.item_version_id = NEW.item_version_id
             AND item.micro_skill_id = skill.micro_skill_id
            WHERE role.blueprint_id = definition.blueprint_id
              AND role.blueprint_version = definition.blueprint_version
              AND role.role_id = NEW.role_id
              AND role.role_name_snapshot = NEW.role_name_snapshot
              AND role.enabled
        ) THEN
        RAISE EXCEPTION 'Generated assessment item does not match its pinned blueprint role and skill'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_item_generation_context
    BEFORE INSERT OR UPDATE ON platform.assessment_item
    FOR EACH ROW EXECUTE FUNCTION platform.validate_assessment_item_generation_context();

COMMENT ON COLUMN platform.assessment_version.blueprint_id IS
    'Exact immutable baseline blueprint identity used to generate this draft.';
COMMENT ON COLUMN platform.assessment_version.blueprint_version IS
    'Exact immutable baseline blueprint version used to generate this draft.';
COMMENT ON COLUMN platform.assessment_version.generation_seed IS
    'Random seed retained as generation provenance; assessment_item is the authoritative manifest.';
COMMENT ON COLUMN platform.assessment_version.generation_idempotency_key IS
    'Client retry key scoped to the trusted L&D actor who generated the draft.';
COMMENT ON COLUMN platform.assessment_item.role_id IS
    'Stable TargetRole ID for which this pinned item was selected.';
