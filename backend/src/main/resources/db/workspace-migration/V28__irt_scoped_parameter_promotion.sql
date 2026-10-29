-- Source-only Session2 extension. V1-V22/history unchanged; no seed or implicit promotion.
CREATE TABLE platform.irt_effective_parameter_selection (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    question_bank_id uuid NOT NULL REFERENCES platform.question_bank,
    model_version_id uuid NOT NULL REFERENCES platform.model_version,
    parameter_set_id uuid NOT NULL,
    selection_revision bigint NOT NULL CHECK (selection_revision > 0),
    selected_by uuid NOT NULL,
    selected_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id, question_bank_id, model_version_id),
    FOREIGN KEY (parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id),
    FOREIGN KEY (selected_by, organization_id) REFERENCES platform.account(account_id, organization_id)
);
CREATE TABLE platform.irt_parameter_promotion_command (
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> '' AND char_length(idempotency_key) <= 200),
    question_bank_id uuid NOT NULL,
    model_version_id uuid NOT NULL,
    request_hash platform.content_hash NOT NULL,
    parameter_set_id uuid NOT NULL,
    parameter_hash platform.content_hash NOT NULL,
    expected_revision bigint NOT NULL CHECK (expected_revision >= 0),
    expected_parameter_set_id uuid,
    selection_revision bigint NOT NULL CHECK (selection_revision = expected_revision + 1),
    reason text NOT NULL CHECK (btrim(reason) <> '' AND char_length(reason) <= 1000),
    occurred_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id, actor_id, idempotency_key),
    UNIQUE (organization_id, question_bank_id, model_version_id, selection_revision),
    UNIQUE (organization_id, question_bank_id, model_version_id, parameter_set_id),
    FOREIGN KEY (organization_id, question_bank_id, model_version_id)
        REFERENCES platform.irt_effective_parameter_selection,
    FOREIGN KEY (actor_id, organization_id) REFERENCES platform.account(account_id, organization_id),
    FOREIGN KEY (parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id),
    FOREIGN KEY (expected_parameter_set_id, model_version_id) REFERENCES platform.irt_parameter_set(parameter_set_id, model_version_id),
    CHECK ((expected_revision = 0) = (expected_parameter_set_id IS NULL))
);
CREATE TRIGGER irt_promotion_command_immutable BEFORE UPDATE OR DELETE ON platform.irt_parameter_promotion_command
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();

CREATE FUNCTION platform.guard_irt_effective_selection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Effective selection history cannot be deleted' USING ERRCODE = '23514';
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.selection_revision <> 1 THEN RAISE EXCEPTION 'First selection revision must be one' USING ERRCODE = '23514'; END IF;
    ELSIF NEW.organization_id <> OLD.organization_id OR NEW.question_bank_id <> OLD.question_bank_id
        OR NEW.model_version_id <> OLD.model_version_id OR NEW.selection_revision <> OLD.selection_revision + 1
        OR NEW.parameter_set_id = OLD.parameter_set_id OR NEW.selected_at <= OLD.selected_at THEN
        RAISE EXCEPTION 'Selection requires stable scope, a new set and next revision' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM platform.irt_parameter_set s
        JOIN platform.irt_calibration_run r ON r.output_parameter_set_id=s.parameter_set_id AND r.model_version_id=s.model_version_id
        JOIN platform.model_version m ON m.model_version_id=s.model_version_id
        JOIN platform.question_bank b ON b.question_bank_id=NEW.question_bank_id
        JOIN platform.account owner ON owner.account_id=b.created_by
        JOIN platform.organization o ON o.organization_id=owner.organization_id
        WHERE s.parameter_set_id=NEW.parameter_set_id AND s.model_version_id=NEW.model_version_id
          AND s.status='PROMOTED' AND s.source='CALIBRATED' AND s.activated_by=NEW.selected_by AND s.activated_at=NEW.selected_at
          AND r.status='SUCCEEDED' AND r.configuration->>'origin'='ACTUAL_PILOT'
          AND r.diagnostics->'result'->>'origin'='ACTUAL_PILOT'
          AND r.configuration->'request'->'scope'->>'organizationId'=NEW.organization_id::text
          AND r.configuration->'request'->'scope'->>'bankId'=NEW.question_bank_id::text
          AND m.approved_by IS NOT NULL AND m.approved_at IS NOT NULL AND m.algorithm='IRT_3PL'
          AND owner.organization_id=NEW.organization_id AND owner.active AND o.status='ACTIVE'
    ) THEN RAISE EXCEPTION 'Scoped approved actual-pilot promotion required' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_effective_selection_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.irt_effective_parameter_selection
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_effective_selection();

CREATE FUNCTION platform.validate_irt_selection_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_revision bigint; previous_set uuid;
BEGIN
    IF TG_OP='INSERT' THEN previous_revision=0; previous_set=NULL;
    ELSE previous_revision=OLD.selection_revision; previous_set=OLD.parameter_set_id; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM platform.irt_parameter_promotion_command c JOIN platform.irt_parameter_set s USING (parameter_set_id,model_version_id)
        WHERE c.organization_id=NEW.organization_id AND c.question_bank_id=NEW.question_bank_id AND c.model_version_id=NEW.model_version_id
          AND c.selection_revision=NEW.selection_revision AND c.parameter_set_id=NEW.parameter_set_id
          AND c.actor_id=NEW.selected_by AND c.occurred_at=NEW.selected_at AND c.parameter_hash=s.parameter_hash
          AND c.expected_revision=previous_revision AND c.expected_parameter_set_id IS NOT DISTINCT FROM previous_set
    ) THEN RAISE EXCEPTION 'Effective selection requires matching immutable command receipt' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER irt_effective_selection_receipt AFTER INSERT OR UPDATE ON platform.irt_effective_parameter_selection
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_irt_selection_receipt();

CREATE FUNCTION platform.guard_irt_promotion_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.irt_effective_parameter_selection s
        WHERE s.organization_id=NEW.organization_id AND s.question_bank_id=NEW.question_bank_id AND s.model_version_id=NEW.model_version_id
          AND s.selection_revision=NEW.selection_revision AND s.parameter_set_id=NEW.parameter_set_id
          AND s.selected_by=NEW.actor_id AND s.selected_at=NEW.occurred_at) THEN
        RAISE EXCEPTION 'Promotion receipt must describe the current transaction selection' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER irt_promotion_receipt_guard BEFORE INSERT ON platform.irt_parameter_promotion_command
    FOR EACH ROW EXECUTE FUNCTION platform.guard_irt_promotion_receipt();
COMMENT ON TABLE platform.irt_effective_parameter_selection IS 'Scope-specific selection for future Blueprint versions; old PROMOTED sets and all historical pins remain immutable.';
COMMENT ON TABLE platform.irt_parameter_promotion_command IS 'Immutable actor/tenant/idempotency request and typed original selection receipt; authenticated owner authorization remains mandatory.';
