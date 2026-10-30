-- Expand only: V1-V17 data, constraints, fixed-assessment consumers and pointers stay intact.
-- Adaptive tables share the stable baseline_blueprint identity. Their separate physical names
-- avoid manufacturing obsolete score weights/counts to satisfy the V9 fixed-role contract.
-- No seed, automatic activation, dry-run history or Employee-attempt state is introduced here.

ALTER TABLE platform.account
    ADD CONSTRAINT account_organization_identity_key UNIQUE (account_id, organization_id);
ALTER TABLE platform.item_version
    ADD CONSTRAINT item_version_micro_skill_identity_key UNIQUE (item_version_id, micro_skill_id);

CREATE TABLE platform.mastery_mapping_version (
    mastery_mapping_version_id uuid PRIMARY KEY,
    mapping_type text NOT NULL CHECK (mapping_type = 'LOGISTIC_CONSERVATIVE_V1'),
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
    configuration_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (configuration ? 'k' AND jsonb_typeof(configuration -> 'k') = 'number'
        AND (configuration ->> 'k')::numeric > 0
        AND (configuration ->> 'k')::numeric < 'Infinity'::numeric)
);

CREATE TABLE platform.irt_parameter_set (
    parameter_set_id uuid PRIMARY KEY,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    source text NOT NULL CHECK (source IN ('SEEDED', 'CALIBRATED')),
    status text NOT NULL CHECK (status IN ('BUILDING', 'CANDIDATE', 'PROMOTED')),
    parameter_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    activated_by uuid REFERENCES platform.account,
    activated_at timestamptz,
    UNIQUE (parameter_set_id, model_version_id),
    CHECK ((status = 'PROMOTED' AND activated_by IS NOT NULL AND activated_at IS NOT NULL)
        OR (status <> 'PROMOTED' AND activated_by IS NULL AND activated_at IS NULL))
);
CREATE INDEX irt_parameter_set_promoted_idx
    ON platform.irt_parameter_set(model_version_id, activated_at DESC)
    WHERE status = 'PROMOTED';

CREATE TABLE platform.irt_item_parameter (
    parameter_set_id uuid NOT NULL REFERENCES platform.irt_parameter_set,
    item_version_id uuid NOT NULL,
    micro_skill_id text NOT NULL CHECK (btrim(micro_skill_id) <> ''),
    discrimination_a numeric NOT NULL CHECK (discrimination_a > 0 AND discrimination_a < 'Infinity'::numeric),
    difficulty_b numeric NOT NULL CHECK (difficulty_b > '-Infinity'::numeric AND difficulty_b < 'Infinity'::numeric),
    guessing_c numeric NOT NULL CHECK (guessing_c >= 0 AND guessing_c < 1),
    fit_diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(fit_diagnostics) = 'object'),
    PRIMARY KEY (parameter_set_id, item_version_id, micro_skill_id),
    FOREIGN KEY (item_version_id, micro_skill_id)
        REFERENCES platform.item_version(item_version_id, micro_skill_id)
);
CREATE INDEX irt_item_parameter_skill_idx
    ON platform.irt_item_parameter(parameter_set_id, micro_skill_id, item_version_id);

CREATE TABLE platform.irt_calibration_run (
    calibration_run_id uuid PRIMARY KEY,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    input_dataset_ref text NOT NULL CHECK (btrim(input_dataset_ref) <> ''),
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
    status text NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    output_parameter_set_id uuid UNIQUE,
    diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(diagnostics) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    FOREIGN KEY (output_parameter_set_id, model_version_id)
        REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id),
    CHECK ((status = 'PENDING' AND started_at IS NULL AND completed_at IS NULL)
        OR (status = 'RUNNING' AND started_at IS NOT NULL AND completed_at IS NULL)
        OR (status IN ('SUCCEEDED', 'FAILED') AND started_at IS NOT NULL AND completed_at IS NOT NULL)),
    CHECK ((status = 'SUCCEEDED') = (output_parameter_set_id IS NOT NULL)),
    CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- BUILDING is an internal assembly state, forbidden at commit. Candidate content is immutable;
-- promotion changes eligibility metadata only. Administrative authorization is supplied in C2.
CREATE FUNCTION platform.guard_irt_parameter_set() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- FOR SHARE also excludes concurrent non-key edits to the pinned configuration.
        PERFORM 1 FROM platform.model_version WHERE model_version_id = NEW.model_version_id FOR SHARE;
        IF NEW.status <> 'BUILDING' THEN
            RAISE EXCEPTION 'Parameter sets must be assembled before sealing' USING ERRCODE = '23514';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Parameter set history is immutable' USING ERRCODE = '23514';
    ELSIF (to_jsonb(NEW) - ARRAY['status', 'activated_by', 'activated_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'activated_by', 'activated_at'])
        OR NOT ((OLD.status = 'BUILDING' AND NEW.status = 'CANDIDATE')
            OR (OLD.status = 'CANDIDATE' AND NEW.status = 'PROMOTED')) THEN
        RAISE EXCEPTION 'Only seal or promote may change a parameter set' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_parameter_set_lifecycle BEFORE INSERT OR UPDATE OR DELETE ON platform.irt_parameter_set
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_parameter_set();

CREATE FUNCTION platform.guard_irt_parameter_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE set_state text;
BEGIN
    SELECT status INTO set_state FROM platform.irt_parameter_set
    WHERE parameter_set_id = NEW.parameter_set_id FOR UPDATE;
    IF set_state IS DISTINCT FROM 'BUILDING' THEN
        RAISE EXCEPTION 'Sealed parameter content cannot be extended' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_parameter_insert BEFORE INSERT ON platform.irt_item_parameter
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_parameter_insert();

CREATE FUNCTION platform.validate_irt_parameter_seal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM platform.irt_parameter_set
        WHERE parameter_set_id = NEW.parameter_set_id AND status = 'BUILDING')
        OR NOT EXISTS (SELECT 1 FROM platform.irt_item_parameter
            WHERE parameter_set_id = NEW.parameter_set_id) THEN
        RAISE EXCEPTION 'Parameter set must be sealed and nonempty before commit' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER irt_parameter_set_sealed AFTER INSERT OR UPDATE ON platform.irt_parameter_set
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_irt_parameter_seal();

CREATE FUNCTION platform.guard_irt_model_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM platform.irt_parameter_set WHERE model_version_id = OLD.model_version_id)
        OR EXISTS (SELECT 1 FROM platform.irt_calibration_run WHERE model_version_id = OLD.model_version_id) THEN
        RAISE EXCEPTION 'IRT parameter sets pin immutable model configuration' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_model_version_pinned BEFORE UPDATE OR DELETE ON platform.model_version
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_model_version();

CREATE FUNCTION platform.guard_irt_calibration_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM 1 FROM platform.model_version WHERE model_version_id = NEW.model_version_id FOR SHARE;
        IF NEW.status <> 'PENDING' THEN
            RAISE EXCEPTION 'Calibration must start pending' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' OR OLD.status IN ('SUCCEEDED', 'FAILED') THEN
        RAISE EXCEPTION 'Completed calibration history is immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['status', 'output_parameter_set_id', 'diagnostics', 'started_at', 'completed_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'output_parameter_set_id', 'diagnostics', 'started_at', 'completed_at'])
        OR NOT ((OLD.status = 'PENDING' AND NEW.status = 'RUNNING')
            OR (OLD.status = 'RUNNING' AND NEW.status IN ('RUNNING', 'SUCCEEDED', 'FAILED')))
        OR (OLD.status = 'RUNNING' AND NEW.started_at IS DISTINCT FROM OLD.started_at) THEN
        RAISE EXCEPTION 'Invalid calibration transition' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'SUCCEEDED' AND NOT EXISTS (SELECT 1 FROM platform.irt_parameter_set
        WHERE parameter_set_id = NEW.output_parameter_set_id AND source = 'CALIBRATED' AND status = 'CANDIDATE') THEN
        RAISE EXCEPTION 'Calibration output must be an immutable calibrated candidate' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_calibration_run_history BEFORE INSERT OR UPDATE OR DELETE ON platform.irt_calibration_run
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_calibration_run();

CREATE FUNCTION platform.valid_adaptive_blueprint_configuration(config jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE bound jsonb; role_key text;
BEGIN
    IF jsonb_typeof(config) IS DISTINCT FROM 'object'
        OR NOT config ?& ARRAY['name', 'exploration', 'roles']
        OR config - ARRAY['name', 'exploration', 'roles'] <> '{}'::jsonb
        OR jsonb_typeof(config -> 'name') IS DISTINCT FROM 'string'
        OR btrim(config ->> 'name') = ''
        OR jsonb_typeof(config -> 'roles') IS DISTINCT FROM 'object'
        OR config -> 'roles' = '{}'::jsonb THEN RETURN false; END IF;
    FOR role_key IN SELECT jsonb_object_keys(config -> 'roles') LOOP
        IF btrim(role_key) = '' OR role_key <> btrim(role_key) THEN RETURN false; END IF;
    END LOOP;
    FOR bound IN SELECT config -> 'exploration' UNION ALL SELECT value FROM jsonb_each(config -> 'roles') LOOP
        IF jsonb_typeof(bound) IS DISTINCT FROM 'object'
            OR NOT bound ?& ARRAY['maxQuestions', 'timeLimitSeconds']
            OR bound - ARRAY['maxQuestions', 'timeLimitSeconds'] <> '{}'::jsonb
            OR jsonb_typeof(bound -> 'maxQuestions') IS DISTINCT FROM 'number'
            OR jsonb_typeof(bound -> 'timeLimitSeconds') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
        IF (bound ->> 'maxQuestions') !~ '^[0-9]+$' OR (bound ->> 'timeLimitSeconds') !~ '^[0-9]+$'
            OR (bound ->> 'maxQuestions')::numeric NOT BETWEEN 1 AND 2147483647
            OR (bound ->> 'timeLimitSeconds')::numeric NOT BETWEEN 1 AND 2147483647 THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
END;
$$;

CREATE TABLE platform.baseline_adaptive_blueprint_working_revision (
    working_revision_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    blueprint_id uuid NOT NULL,
    revision bigint NOT NULL CHECK (revision > 0),
    configuration jsonb NOT NULL CHECK (platform.valid_adaptive_blueprint_configuration(configuration)),
    state text NOT NULL CHECK (state IN ('OPEN', 'FINALIZED', 'ABANDONED')),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid NOT NULL,
    updated_at timestamptz NOT NULL,
    closed_at timestamptz,
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (created_by, organization_id) REFERENCES platform.account(account_id, organization_id),
    FOREIGN KEY (updated_by, organization_id) REFERENCES platform.account(account_id, organization_id),
    CHECK ((state = 'OPEN') = (closed_at IS NULL))
);
CREATE UNIQUE INDEX baseline_adaptive_blueprint_one_working_idx
    ON platform.baseline_adaptive_blueprint_working_revision(organization_id, occupation_id) WHERE state = 'OPEN';

CREATE TABLE platform.baseline_adaptive_blueprint_version (
    blueprint_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    occupation_name_snapshot text NOT NULL CHECK (btrim(occupation_name_snapshot) <> ''),
    catalog_fingerprint text NOT NULL CHECK (btrim(catalog_fingerprint) <> ''),
    exploration_max_questions integer NOT NULL CHECK (exploration_max_questions > 0),
    exploration_time_limit_seconds integer NOT NULL CHECK (exploration_time_limit_seconds > 0),
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    mastery_mapping_version_id uuid NOT NULL REFERENCES platform.mastery_mapping_version,
    parameter_set_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (blueprint_id, version),
    UNIQUE (organization_id, occupation_id, blueprint_id, version),
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (created_by, organization_id) REFERENCES platform.account(account_id, organization_id),
    FOREIGN KEY (parameter_set_id, model_version_id)
        REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id)
);

CREATE TABLE platform.baseline_adaptive_blueprint_role (
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL,
    role_id text NOT NULL CHECK (btrim(role_id) <> '' AND role_id = btrim(role_id)),
    role_name_snapshot text NOT NULL CHECK (btrim(role_name_snapshot) <> ''),
    catalog_version text NOT NULL CHECK (btrim(catalog_version) <> ''),
    max_questions integer NOT NULL CHECK (max_questions > 0),
    time_limit_seconds integer NOT NULL CHECK (time_limit_seconds > 0),
    PRIMARY KEY (blueprint_id, blueprint_version, role_id),
    FOREIGN KEY (blueprint_id, blueprint_version)
        REFERENCES platform.baseline_adaptive_blueprint_version(blueprint_id, version)
);
CREATE TABLE platform.baseline_adaptive_blueprint_skill (
    blueprint_id uuid NOT NULL,
    blueprint_version integer NOT NULL,
    role_id text NOT NULL,
    micro_skill_id text NOT NULL CHECK (btrim(micro_skill_id) <> '' AND micro_skill_id = btrim(micro_skill_id)),
    micro_skill_name_snapshot text NOT NULL CHECK (btrim(micro_skill_name_snapshot) <> ''),
    catalog_version text NOT NULL CHECK (btrim(catalog_version) <> ''),
    PRIMARY KEY (blueprint_id, blueprint_version, role_id, micro_skill_id),
    FOREIGN KEY (blueprint_id, blueprint_version, role_id)
        REFERENCES platform.baseline_adaptive_blueprint_role(blueprint_id, blueprint_version, role_id)
);

CREATE TABLE platform.baseline_blueprint_activation (
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    blueprint_id uuid NOT NULL,
    blueprint_version integer,
    activation_revision bigint NOT NULL CHECK (activation_revision > 0),
    state text GENERATED ALWAYS AS (CASE WHEN blueprint_version IS NULL THEN 'DISABLED' ELSE 'ACTIVE' END) STORED,
    activated_by uuid NOT NULL,
    activated_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id, occupation_id),
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version)
        REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version),
    FOREIGN KEY (activated_by, organization_id) REFERENCES platform.account(account_id, organization_id)
);

CREATE TABLE platform.baseline_blueprint_activation_event (
    activation_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    activation_revision bigint NOT NULL CHECK (activation_revision > 0),
    blueprint_id uuid NOT NULL,
    blueprint_version integer,
    operation text NOT NULL CHECK (operation IN ('FINALIZE', 'DISABLE')),
    actor_id uuid NOT NULL,
    reason text,
    occurred_at timestamptz NOT NULL,
    UNIQUE (organization_id, occupation_id, activation_revision),
    FOREIGN KEY (organization_id, occupation_id) REFERENCES platform.baseline_blueprint_activation,
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (organization_id, occupation_id, blueprint_id, blueprint_version)
        REFERENCES platform.baseline_adaptive_blueprint_version(organization_id, occupation_id, blueprint_id, version),
    FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id),
    CHECK ((operation = 'FINALIZE' AND blueprint_version IS NOT NULL)
        OR (operation = 'DISABLE' AND blueprint_version IS NULL AND reason IS NOT NULL AND btrim(reason) <> ''))
);
CREATE INDEX baseline_blueprint_activation_event_time_idx
    ON platform.baseline_blueprint_activation_event(organization_id, occupation_id, occurred_at DESC);
CREATE UNIQUE INDEX baseline_blueprint_finalization_version_idx
    ON platform.baseline_blueprint_activation_event(blueprint_id, blueprint_version) WHERE operation = 'FINALIZE';

CREATE TABLE platform.baseline_blueprint_command (
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    occupation_id text NOT NULL,
    blueprint_id uuid NOT NULL,
    operation text NOT NULL CHECK (operation IN ('SAVE', 'FINALIZE', 'DISABLE')),
    request_hash platform.content_hash NOT NULL,
    response_payload jsonb NOT NULL CHECK (jsonb_typeof(response_payload) = 'object'),
    created_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id, actor_id, idempotency_key),
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id)
);

-- Both version families use one sequence per identity. Lock the common identity first, including
-- first writes with no activation row; A3 must allocate max(fixed, adaptive)+1 under that same lock.
-- The registry's PK enforces the cross-family invariant even with a stale transaction snapshot.
CREATE TABLE platform.baseline_blueprint_version_registry (
    blueprint_id uuid NOT NULL REFERENCES platform.baseline_blueprint,
    version integer NOT NULL CHECK (version > 0),
    contract_family text NOT NULL CHECK (contract_family IN ('FIXED', 'ADAPTIVE')),
    PRIMARY KEY (blueprint_id, version)
);
INSERT INTO platform.baseline_blueprint_version_registry(blueprint_id, version, contract_family)
SELECT blueprint_id, version, 'FIXED' FROM platform.baseline_blueprint_version;

CREATE FUNCTION platform.guard_baseline_version_namespace() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM platform.baseline_blueprint WHERE blueprint_id = NEW.blueprint_id FOR UPDATE;
    INSERT INTO platform.baseline_blueprint_version_registry(blueprint_id, version, contract_family)
    VALUES (NEW.blueprint_id, NEW.version,
        CASE WHEN TG_TABLE_NAME = 'baseline_blueprint_version' THEN 'FIXED' ELSE 'ADAPTIVE' END);
    IF TG_TABLE_NAME = 'baseline_adaptive_blueprint_version' THEN
        IF NOT EXISTS (SELECT 1 FROM platform.irt_parameter_set
            WHERE parameter_set_id = NEW.parameter_set_id AND status = 'PROMOTED') THEN
            RAISE EXCEPTION 'New Blueprint requires a promoted parameter set' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_fixed_version_namespace BEFORE INSERT ON platform.baseline_blueprint_version
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_version_namespace();
CREATE TRIGGER baseline_adaptive_version_namespace BEFORE INSERT ON platform.baseline_adaptive_blueprint_version
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_version_namespace();

-- Mutable coordination only; closed working revisions remain in their immutable history tables.
CREATE TABLE platform.baseline_blueprint_working_registry (
    blueprint_id uuid PRIMARY KEY REFERENCES platform.baseline_blueprint,
    working_revision_id uuid NOT NULL UNIQUE,
    contract_family text NOT NULL CHECK (contract_family IN ('FIXED', 'ADAPTIVE'))
);
INSERT INTO platform.baseline_blueprint_working_registry(blueprint_id, working_revision_id, contract_family)
SELECT blueprint_id, working_revision_id, 'FIXED'
FROM platform.baseline_blueprint_working_revision WHERE state = 'OPEN';

CREATE FUNCTION platform.guard_baseline_working_namespace() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM platform.baseline_blueprint WHERE blueprint_id = NEW.blueprint_id FOR UPDATE;
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'baseline_adaptive_blueprint_working_revision'
            AND (NEW.state <> 'OPEN' OR NEW.revision <> 1) THEN
            RAISE EXCEPTION 'Adaptive working revision must start open at revision one' USING ERRCODE = '23514';
        END IF;
        IF NEW.state = 'OPEN' THEN
            INSERT INTO platform.baseline_blueprint_working_registry(blueprint_id, working_revision_id, contract_family)
            VALUES (NEW.blueprint_id, NEW.working_revision_id,
                CASE WHEN TG_TABLE_NAME = 'baseline_blueprint_working_revision' THEN 'FIXED' ELSE 'ADAPTIVE' END);
        END IF;
    ELSE
        IF NEW.blueprint_id <> OLD.blueprint_id OR NEW.working_revision_id <> OLD.working_revision_id
            OR NEW.organization_id <> OLD.organization_id OR NEW.occupation_id <> OLD.occupation_id THEN
            RAISE EXCEPTION 'Working revision scope is immutable' USING ERRCODE = '23514';
        END IF;
        IF OLD.state = 'OPEN' AND NEW.state <> 'OPEN' THEN
            DELETE FROM platform.baseline_blueprint_working_registry
            WHERE blueprint_id = OLD.blueprint_id AND working_revision_id = OLD.working_revision_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_fixed_working_namespace BEFORE INSERT OR UPDATE ON platform.baseline_blueprint_working_revision
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_working_namespace();
CREATE TRIGGER baseline_adaptive_working_namespace BEFORE INSERT OR UPDATE ON platform.baseline_adaptive_blueprint_working_revision
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_working_namespace();

CREATE FUNCTION platform.guard_adaptive_working_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.state <> 'OPEN' THEN
        RAISE EXCEPTION 'Closed adaptive working revision is immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['revision', 'configuration', 'state', 'updated_by', 'updated_at', 'closed_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revision', 'configuration', 'state', 'updated_by', 'updated_at', 'closed_at'])
        OR NEW.revision <> OLD.revision + 1 THEN
        RAISE EXCEPTION 'Adaptive revision requires stable identity and next revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER adaptive_working_revision_history BEFORE UPDATE OR DELETE ON platform.baseline_adaptive_blueprint_working_revision
    FOR EACH ROW EXECUTE FUNCTION platform.guard_adaptive_working_revision();

CREATE FUNCTION platform.guard_baseline_activation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Disable availability rather than deleting the pointer' USING ERRCODE = '23514';
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.activation_revision <> 1 OR NEW.blueprint_version IS NULL THEN
            RAISE EXCEPTION 'First activation requires version and revision one' USING ERRCODE = '23514';
        END IF;
    ELSIF NEW.organization_id <> OLD.organization_id OR NEW.occupation_id <> OLD.occupation_id
        OR NEW.blueprint_id <> OLD.blueprint_id OR NEW.activation_revision <> OLD.activation_revision + 1 THEN
        RAISE EXCEPTION 'Activation requires stable scope and next revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_activation_revision BEFORE INSERT OR UPDATE OR DELETE ON platform.baseline_blueprint_activation
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_activation();

-- A finalized version is created with its complete membership and activation event in one commit.
-- Once an activation event exists, neither more roles nor more skills may be appended to it.
CREATE FUNCTION platform.guard_adaptive_membership_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM platform.baseline_adaptive_blueprint_version
    WHERE blueprint_id = NEW.blueprint_id AND version = NEW.blueprint_version FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adaptive parent version must be visible before membership' USING ERRCODE = '23503';
    END IF;
    IF EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation_event
        WHERE blueprint_id = NEW.blueprint_id AND blueprint_version = NEW.blueprint_version) THEN
        RAISE EXCEPTION 'Finalized Blueprint membership is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER adaptive_role_membership_insert BEFORE INSERT ON platform.baseline_adaptive_blueprint_role
    FOR EACH ROW EXECUTE FUNCTION platform.guard_adaptive_membership_insert();
CREATE TRIGGER adaptive_skill_membership_insert BEFORE INSERT ON platform.baseline_adaptive_blueprint_skill
    FOR EACH ROW EXECUTE FUNCTION platform.guard_adaptive_membership_insert();

CREATE FUNCTION platform.validate_adaptive_blueprint_finalization() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_adaptive_blueprint_role
        WHERE blueprint_id = NEW.blueprint_id AND blueprint_version = NEW.version)
        OR EXISTS (SELECT 1 FROM platform.baseline_adaptive_blueprint_role role
            WHERE role.blueprint_id = NEW.blueprint_id AND role.blueprint_version = NEW.version
              AND NOT EXISTS (SELECT 1 FROM platform.baseline_adaptive_blueprint_skill skill
                WHERE skill.blueprint_id = role.blueprint_id AND skill.blueprint_version = role.blueprint_version
                  AND skill.role_id = role.role_id))
        OR NOT EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation_event
            WHERE blueprint_id = NEW.blueprint_id AND blueprint_version = NEW.version AND operation = 'FINALIZE') THEN
        RAISE EXCEPTION 'Finalization requires roles, skills and an activation event' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER adaptive_blueprint_finalized AFTER INSERT ON platform.baseline_adaptive_blueprint_version
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_adaptive_blueprint_finalization();

CREATE FUNCTION platform.validate_baseline_activation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation_event event
        WHERE event.organization_id = NEW.organization_id AND event.occupation_id = NEW.occupation_id
          AND event.activation_revision = NEW.activation_revision AND event.blueprint_id = NEW.blueprint_id
          AND event.blueprint_version IS NOT DISTINCT FROM NEW.blueprint_version
          AND event.actor_id = NEW.activated_by AND event.occurred_at = NEW.activated_at) THEN
        RAISE EXCEPTION 'Activation requires matching append-only audit event' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER baseline_activation_audited AFTER INSERT OR UPDATE ON platform.baseline_blueprint_activation
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_activation_event();

CREATE FUNCTION platform.guard_baseline_activation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.baseline_blueprint_activation current_pointer
        WHERE current_pointer.organization_id = NEW.organization_id AND current_pointer.occupation_id = NEW.occupation_id
          AND current_pointer.activation_revision = NEW.activation_revision AND current_pointer.blueprint_id = NEW.blueprint_id
          AND current_pointer.blueprint_version IS NOT DISTINCT FROM NEW.blueprint_version
          AND current_pointer.activated_by = NEW.actor_id AND current_pointer.activated_at = NEW.occurred_at) THEN
        RAISE EXCEPTION 'Activation event must describe the current transaction pointer' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_activation_event_matches_pointer BEFORE INSERT ON platform.baseline_blueprint_activation_event
    FOR EACH ROW EXECUTE FUNCTION platform.guard_baseline_activation_event();

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['mastery_mapping_version', 'irt_item_parameter',
        'baseline_adaptive_blueprint_version', 'baseline_adaptive_blueprint_role',
        'baseline_adaptive_blueprint_skill', 'baseline_blueprint_activation_event', 'baseline_blueprint_command',
        'baseline_blueprint_version_registry'] LOOP
        EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON platform.%I
            FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation()', table_name);
    END LOOP;
END;
$$;

COMMENT ON TABLE platform.baseline_adaptive_blueprint_version IS
    'Adaptive immutable history beside V9 fixed history; same logical identity, disjoint version namespace.';
COMMENT ON TABLE platform.baseline_adaptive_blueprint_working_revision IS
    'Adaptive configuration only; at most one open working revision across fixed and adaptive storage.';
COMMENT ON TABLE platform.baseline_blueprint_activation IS
    'Adaptive current pointer only. Does not replace or read the V14 active assessment pointer.';
COMMENT ON TABLE platform.baseline_blueprint_command IS
    'Typed response receipts keyed by organization, actor and retry key across Occupations; no dry-run receipts.';
COMMENT ON COLUMN platform.irt_parameter_set.status IS
    'BUILDING is transaction-local assembly; immutable CANDIDATE may only be promoted by an authorized Admin service.';
