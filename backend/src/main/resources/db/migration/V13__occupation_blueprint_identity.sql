CREATE TABLE platform.baseline_blueprint (
    blueprint_id uuid PRIMARY KEY,
    occupation_id text,
    created_by uuid NOT NULL REFERENCES platform.account,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (occupation_id IS NULL OR btrim(occupation_id) <> '')
);

-- Never guess when historical versions disagree about their Occupation.
DO $$
BEGIN
    IF EXISTS (
        SELECT blueprint_id
        FROM platform.baseline_blueprint_version
        WHERE occupation_id IS NOT NULL
        GROUP BY blueprint_id
        HAVING count(DISTINCT occupation_id) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot backfill blueprint identity: versions disagree about occupation_id'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT occupation_id
        FROM platform.baseline_blueprint_version
        WHERE occupation_id IS NOT NULL
        GROUP BY occupation_id
        HAVING count(DISTINCT blueprint_id) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot backfill blueprint identity: an occupation has multiple blueprint IDs'
            USING ERRCODE = '23505';
    END IF;
END;
$$;

INSERT INTO platform.baseline_blueprint (
    blueprint_id, occupation_id, created_by, created_at)
SELECT blueprint_id,
       max(occupation_id),
       (array_agg(created_by ORDER BY version))[1],
       min(created_at)
FROM platform.baseline_blueprint_version
GROUP BY blueprint_id;

CREATE UNIQUE INDEX baseline_blueprint_occupation_unique
    ON platform.baseline_blueprint (occupation_id)
    WHERE occupation_id IS NOT NULL;

ALTER TABLE platform.baseline_blueprint_version
    ADD CONSTRAINT baseline_blueprint_version_identity_fk
        FOREIGN KEY (blueprint_id) REFERENCES platform.baseline_blueprint(blueprint_id);

CREATE FUNCTION platform.validate_baseline_blueprint_occupation_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    identity_occupation_id text;
BEGIN
    SELECT identity.occupation_id
    INTO identity_occupation_id
    FROM platform.baseline_blueprint identity
    WHERE identity.blueprint_id = NEW.blueprint_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Baseline blueprint identity is missing'
            USING ERRCODE = '23503';
    END IF;

    IF identity_occupation_id IS DISTINCT FROM NEW.occupation_id THEN
        RAISE EXCEPTION 'Blueprint version occupation does not match its logical identity'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER baseline_blueprint_occupation_identity
    BEFORE INSERT ON platform.baseline_blueprint_version
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_blueprint_occupation_identity();

CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_blueprint
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();

COMMENT ON TABLE platform.baseline_blueprint IS
    'Logical baseline blueprint identity; immutable versions remain in baseline_blueprint_version.';
COMMENT ON COLUMN platform.baseline_blueprint.occupation_id IS
    'One stable Occupation ID per logical blueprint; null is retained only for migrated legacy identities.';
