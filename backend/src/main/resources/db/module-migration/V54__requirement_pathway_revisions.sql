-- New starts/switches use the actual accepted write time even after waiting on the existing learner lock.
-- Existing historical timestamps are retained unchanged.
ALTER TABLE platform.module_learning_pin ALTER COLUMN started_at SET DEFAULT clock_timestamp();
ALTER TABLE platform.learning_version_switch ALTER COLUMN switched_at SET DEFAULT clock_timestamp();
CREATE TABLE platform.pathway_requirement_snapshot (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    content_hash platform.content_hash NOT NULL,
    snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
    created_at timestamptz NOT NULL,
    UNIQUE (id,organization_id,learner_id,selection_id,selection_revision),
    FOREIGN KEY (selection_id,organization_id,learner_id,selection_revision)
        REFERENCES platform.employee_role_selection(selection_id,organization_id,learner_id,target_revision)
);
ALTER TABLE platform.initial_pathway_request
    ADD COLUMN flow_version text NOT NULL DEFAULT 'NUMERIC_V1' CHECK (flow_version IN ('NUMERIC_V1','RULE_R3')),
    ADD COLUMN requirement_snapshot_id uuid,
    ALTER COLUMN gap_snapshot_id DROP NOT NULL,
    ADD CONSTRAINT initial_requirement_snapshot_owner FOREIGN KEY
        (requirement_snapshot_id,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.pathway_requirement_snapshot(id,organization_id,learner_id,selection_id,selection_revision),
    ADD CONSTRAINT initial_flow_snapshot_shape CHECK
        ((flow_version='NUMERIC_V1' AND gap_snapshot_id IS NOT NULL AND requirement_snapshot_id IS NULL)
        OR (flow_version='RULE_R3' AND gap_snapshot_id IS NULL AND requirement_snapshot_id IS NOT NULL));
CREATE OR REPLACE FUNCTION platform.initial_request_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Confirmed requests cannot be deleted' USING ERRCODE='23514'; END IF;
    IF ROW(NEW.request_id,NEW.organization_id,NEW.learner_id,NEW.selection_id,NEW.selection_revision,
        NEW.gap_snapshot_id,NEW.planning_input_hash,NEW.algorithm_version,NEW.configuration_version,
        NEW.frozen_input,NEW.created_at,NEW.flow_version,NEW.requirement_snapshot_id)
        IS DISTINCT FROM ROW(OLD.request_id,OLD.organization_id,OLD.learner_id,OLD.selection_id,OLD.selection_revision,
        OLD.gap_snapshot_id,OLD.planning_input_hash,OLD.algorithm_version,OLD.configuration_version,
        OLD.frozen_input,OLD.created_at,OLD.flow_version,OLD.requirement_snapshot_id)
    THEN RAISE EXCEPTION 'Confirmed request input is immutable' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END; $$;
ALTER TABLE platform.initial_pathway_revision
    ADD COLUMN change_origin text NOT NULL DEFAULT 'EXPERT' CHECK (change_origin IN ('INITIAL','EXPERT','ASSESSMENT','CERTIFICATE','PROVISION')),
    ADD COLUMN source_event_id uuid,
    ADD COLUMN approval_basis_revision bigint,
    ADD CONSTRAINT initial_revision_learner_key UNIQUE (request_id,revision,organization_id,learner_id),
    ADD CONSTRAINT initial_approval_basis FOREIGN KEY (request_id,approval_basis_revision)
        REFERENCES platform.initial_pathway_revision(request_id,revision),
    ADD CONSTRAINT initial_approval_basis_older CHECK (approval_basis_revision IS NULL OR approval_basis_revision<=revision);
-- Forward extension of the V34 projection format; old immutable revisions retain their original values.
ALTER TABLE platform.initial_pathway_revision DROP CONSTRAINT initial_pathway_revision_format_version_check;
ALTER TABLE platform.initial_pathway_revision ADD CONSTRAINT initial_pathway_revision_format_version_check CHECK (format_version IN (1,2,3));
CREATE UNIQUE INDEX initial_revision_source_event ON platform.initial_pathway_revision(request_id,source_event_id)
    WHERE source_event_id IS NOT NULL;
CREATE TABLE platform.pathway_requirement_step (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    step_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    requirement_snapshot jsonb NOT NULL CHECK (jsonb_typeof(requirement_snapshot)='object'),
    provision text NOT NULL CHECK (provision IN ('MODULE_ONLY','CERTIFICATE_ONLY','UNCONFIGURED')),
    certificate_id text,
    certificate_version text,
    kind text NOT NULL CHECK (kind IN ('REQUIRED','PARALLEL_SUPPLEMENT')),
    source_bypass_id uuid,
    state text NOT NULL CHECK (state IN ('NEEDS_SUPPLEMENTATION','NEEDS_EXPERT_ACTION','IN_PROGRESS','FULFILLED','BYPASSED')),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    ordinal integer NOT NULL CHECK (ordinal>0),
    fulfilled_evidence_id uuid,
    PRIMARY KEY (request_id,revision,step_id),
    UNIQUE (request_id,revision,organization_id,learner_id,step_id),
    UNIQUE NULLS NOT DISTINCT (request_id,revision,skill_id,knowledge_level,kind,source_bypass_id),
    UNIQUE (request_id,revision,ordinal),
    FOREIGN KEY (request_id,revision,organization_id,learner_id)
        REFERENCES platform.initial_pathway_revision(request_id,revision,organization_id,learner_id),
    FOREIGN KEY (organization_id,learner_id,fulfilled_evidence_id)
        REFERENCES platform.skill_knowledge_evidence(organization_id,learner_id,id),
    CHECK ((kind='PARALLEL_SUPPLEMENT')=(source_bypass_id IS NOT NULL)),
    CHECK ((state='FULFILLED')=(fulfilled_evidence_id IS NOT NULL)),
    CHECK ((certificate_id IS NULL)=(certificate_version IS NULL)),
    CHECK (provision='CERTIFICATE_ONLY' OR certificate_id IS NULL)
);
CREATE TABLE platform.pathway_requirement_option (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    step_id uuid NOT NULL,
    module_id text NOT NULL CHECK (btrim(module_id)<>''),
    content_version text NOT NULL CHECK (btrim(content_version)<>''),
    module_revision integer NOT NULL CHECK (module_revision>0),
    compatibility_snapshot jsonb NOT NULL CHECK (jsonb_typeof(compatibility_snapshot)='object'),
    PRIMARY KEY (request_id,revision,step_id,module_id,content_version),
    FOREIGN KEY (request_id,revision,step_id) REFERENCES platform.pathway_requirement_step
);
CREATE TABLE platform.pathway_requirement_dependency (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    prerequisite_step_id uuid NOT NULL,
    dependent_step_id uuid NOT NULL,
    assessed_source jsonb NOT NULL CHECK (jsonb_typeof(assessed_source)='object'),
    PRIMARY KEY (request_id,revision,prerequisite_step_id,dependent_step_id),
    FOREIGN KEY (request_id,revision,prerequisite_step_id) REFERENCES platform.pathway_requirement_step,
    FOREIGN KEY (request_id,revision,dependent_step_id) REFERENCES platform.pathway_requirement_step,
    CHECK (prerequisite_step_id<>dependent_step_id)
);
CREATE TABLE platform.pathway_requirement_bypass (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    step_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    assignment_snapshot jsonb NOT NULL CHECK (jsonb_typeof(assignment_snapshot)='object'),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    decided_at timestamptz NOT NULL,
    retry_key uuid NOT NULL,
    supersedes_id uuid,
    UNIQUE (organization_id,learner_id,id),
    UNIQUE (organization_id,expert_id,retry_key),
    FOREIGN KEY (request_id,revision,organization_id,learner_id,step_id)
        REFERENCES platform.pathway_requirement_step(request_id,revision,organization_id,learner_id,step_id),
    FOREIGN KEY (organization_id,learner_id,supersedes_id)
        REFERENCES platform.pathway_requirement_bypass(organization_id,learner_id,id),
    FOREIGN KEY (expert_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
ALTER TABLE platform.pathway_requirement_step ADD CONSTRAINT parallel_bypass_owner
    FOREIGN KEY (organization_id,learner_id,source_bypass_id)
        REFERENCES platform.pathway_requirement_bypass(organization_id,learner_id,id);
CREATE INDEX requirement_blocking ON platform.pathway_requirement_step(organization_id,learner_id,request_id,revision,state)
    WHERE kind='REQUIRED';
CREATE INDEX requirement_options_module ON platform.pathway_requirement_option(module_id,request_id,revision);
DO $$ DECLARE owner text; BEGIN
    FOREACH owner IN ARRAY ARRAY['pathway_requirement_snapshot','pathway_requirement_step',
        'pathway_requirement_option','pathway_requirement_dependency','pathway_requirement_bypass']
    LOOP EXECUTE format('CREATE TRIGGER rule_history_immutable BEFORE UPDATE OR DELETE ON platform.%I
        FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_history()',owner); END LOOP;
END; $$;
