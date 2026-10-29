CREATE TABLE platform.baseline_management_command (
    actor_id uuid NOT NULL REFERENCES platform.account(account_id),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    operation text NOT NULL CHECK (btrim(operation) <> ''),
    request_hash platform.content_hash NOT NULL,
    response_json jsonb NOT NULL CHECK (jsonb_typeof(response_json) = 'object'),
    created_at timestamptz NOT NULL,
    PRIMARY KEY (actor_id, idempotency_key),
    FOREIGN KEY (organization_id, occupation_id)
        REFERENCES platform.baseline_assessment_series(organization_id, occupation_id)
);

CREATE FUNCTION platform.validate_baseline_command_actor()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    actor_organization_id uuid;
BEGIN
    SELECT organization_id INTO actor_organization_id
    FROM platform.account WHERE account_id = NEW.actor_id;
    IF actor_organization_id IS DISTINCT FROM NEW.organization_id THEN
        RAISE EXCEPTION 'Baseline command actor is outside the command organization'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER baseline_command_actor_scope
    BEFORE INSERT ON platform.baseline_management_command
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_command_actor();

CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_management_command
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();

COMMENT ON TABLE platform.baseline_management_command IS
    'Immutable command receipts used to replay management writes by trusted actor and key.';
