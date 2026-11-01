CREATE TABLE platform.baseline_blueprint_version (
    blueprint_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    occupation_id text,
    occupation_name_snapshot text,
    created_by uuid NOT NULL REFERENCES platform.account,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (blueprint_id, version),
    CHECK (
        (occupation_id IS NULL AND occupation_name_snapshot IS NULL)
        OR
        (occupation_id IS NOT NULL AND btrim(occupation_id) <> ''
            AND occupation_name_snapshot IS NOT NULL
            AND btrim(occupation_name_snapshot) <> '')
    )
);

CREATE TABLE platform.baseline_blueprint_role (
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL,
    role_id text NOT NULL CHECK (btrim(role_id) <> ''),
    role_name_snapshot text NOT NULL CHECK (btrim(role_name_snapshot) <> ''),
    enabled boolean NOT NULL,
    total_question_count integer NOT NULL CHECK (total_question_count >= 0),
    easy_score_weight platform.unit_interval NOT NULL,
    medium_score_weight platform.unit_interval NOT NULL,
    hard_score_weight platform.unit_interval NOT NULL,
    PRIMARY KEY (blueprint_id, blueprint_version, role_id),
    FOREIGN KEY (blueprint_id, blueprint_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    CHECK (easy_score_weight + medium_score_weight + hard_score_weight = 1)
);

CREATE TABLE platform.baseline_blueprint_skill (
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL,
    role_id text NOT NULL,
    micro_skill_id text NOT NULL CHECK (btrim(micro_skill_id) <> ''),
    micro_skill_name_snapshot text NOT NULL CHECK (btrim(micro_skill_name_snapshot) <> ''),
    easy_question_count integer NOT NULL CHECK (easy_question_count >= 0),
    medium_question_count integer NOT NULL CHECK (medium_question_count >= 0),
    hard_question_count integer NOT NULL CHECK (hard_question_count >= 0),
    PRIMARY KEY (blueprint_id, blueprint_version, role_id, micro_skill_id),
    FOREIGN KEY (blueprint_id, blueprint_version, role_id)
        REFERENCES platform.baseline_blueprint_role(blueprint_id, blueprint_version, role_id)
);

COMMENT ON TABLE platform.baseline_blueprint_version IS
    'Immutable version of the L&D baseline assessment configuration.';
COMMENT ON COLUMN platform.baseline_blueprint_version.occupation_id IS
    'Optional stable Neo4j Occupation ID; absent until the Occupation contract is available.';
COMMENT ON COLUMN platform.baseline_blueprint_role.total_question_count IS
    'System-computed total of Easy, Medium, and Hard counts across this role skills.';

CREATE FUNCTION platform.validate_baseline_blueprint_role_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    expected_total integer;
    configured_total bigint;
BEGIN
    SELECT role.total_question_count
    INTO expected_total
    FROM platform.baseline_blueprint_role role
    WHERE role.blueprint_id = NEW.blueprint_id
      AND role.blueprint_version = NEW.blueprint_version
      AND role.role_id = NEW.role_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Blueprint role is missing while validating configured total'
            USING ERRCODE = '23503';
    END IF;

    SELECT coalesce(sum(
        skill.easy_question_count::bigint
        + skill.medium_question_count::bigint
        + skill.hard_question_count::bigint), 0)
    INTO configured_total
    FROM platform.baseline_blueprint_skill skill
    WHERE skill.blueprint_id = NEW.blueprint_id
      AND skill.blueprint_version = NEW.blueprint_version
      AND skill.role_id = NEW.role_id;

    IF expected_total <> configured_total THEN
        RAISE EXCEPTION
            'Blueprint role total % does not match configured skill total %',
            expected_total, configured_total
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER baseline_blueprint_role_total
    AFTER INSERT ON platform.baseline_blueprint_role
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_blueprint_role_total();

CREATE CONSTRAINT TRIGGER baseline_blueprint_skill_total
    AFTER INSERT ON platform.baseline_blueprint_skill
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_blueprint_role_total();

CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_blueprint_version
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_blueprint_role
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_blueprint_skill
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
