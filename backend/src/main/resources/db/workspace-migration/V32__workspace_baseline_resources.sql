ALTER TABLE platform.occupation_department_reference
    ADD CONSTRAINT occupation_reference_tenant_key UNIQUE (occupation_reference_id, organization_id);

CREATE TABLE platform.workspace_baseline_resource (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    occupation_reference_id uuid NOT NULL,
    graph_occupation_id text NOT NULL CHECK (graph_occupation_id <> '' AND graph_occupation_id = btrim(graph_occupation_id)),
    question_bank_id uuid REFERENCES platform.question_bank,
    model_version_id uuid REFERENCES platform.model_version,
    mastery_mapping_version_id uuid REFERENCES platform.mastery_mapping_version,
    PRIMARY KEY (organization_id, graph_occupation_id),
    UNIQUE (organization_id, occupation_reference_id),
    FOREIGN KEY (occupation_reference_id, organization_id)
        REFERENCES platform.occupation_department_reference(occupation_reference_id, organization_id)
);

COMMENT ON TABLE platform.workspace_baseline_resource IS
    'Explicit tenant catalog grant and baseline resource binding. Null pins are unconfigured; integration never publishes or seeds content.';

CREATE FUNCTION platform.validate_baseline_bank_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.question_bank_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
        WHERE b.question_bank_id=NEW.question_bank_id AND a.organization_id=NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Baseline question bank must belong to the same organization' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_bank_tenant_guard BEFORE INSERT OR UPDATE ON platform.workspace_baseline_resource
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_bank_owner();
