-- r3 forward definition, mirrored across supported lineages. Apply only the instance's existing lineage.
-- No old records/checksums are rewritten.
ALTER TABLE platform.question_bank_workspace ADD CONSTRAINT rule_bank_owner_key
    UNIQUE (organization_id,question_bank_id);
CREATE TABLE platform.assessment_rule_policy_version (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    version bigint NOT NULL CHECK (version > 0),
    configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration)='object'),
    configuration_hash platform.content_hash NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL,
    published_by uuid NOT NULL,
    published_at timestamptz NOT NULL,
    UNIQUE (organization_id,purpose,version),
    UNIQUE (organization_id,purpose,id),
    FOREIGN KEY (created_by,organization_id) REFERENCES platform.account(account_id,organization_id),
    FOREIGN KEY (published_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.assessment_rule_policy_activation (
    organization_id uuid NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    current_policy_version_id uuid NOT NULL,
    revision bigint NOT NULL CHECK (revision > 0),
    changed_by uuid NOT NULL,
    changed_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id,purpose),
    FOREIGN KEY (organization_id,purpose,current_policy_version_id)
        REFERENCES platform.assessment_rule_policy_version(organization_id,purpose,id),
    FOREIGN KEY (changed_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.assessment_item_knowledge_mapping (
    item_version_id uuid PRIMARY KEY REFERENCES platform.item_version,
    organization_id uuid NOT NULL,
    question_bank_id uuid NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    outcome_code text NOT NULL CHECK (btrim(outcome_code)<>''),
    mandatory boolean NOT NULL,
    mapping_version bigint NOT NULL CHECK (mapping_version>0),
    mapping_hash platform.content_hash NOT NULL,
    UNIQUE (organization_id,item_version_id),
    FOREIGN KEY (organization_id,question_bank_id)
        REFERENCES platform.question_bank_workspace(organization_id,question_bank_id)
);
-- Bind mappings to the real published definition and its owned bank, never a copied key.
CREATE FUNCTION platform.guard_rule_item_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform.item_version i WHERE i.item_version_id=NEW.item_version_id
        AND i.question_bank_id=NEW.question_bank_id AND i.publication_state='PUBLISHED'
        AND i.micro_skill_id=NEW.skill_id)
    THEN RAISE EXCEPTION 'Mapping requires exact owned published item' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER rule_item_mapping_guard BEFORE INSERT ON platform.assessment_item_knowledge_mapping
    FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_item_mapping();

CREATE TABLE platform.rule_assessment_attempt (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    context_key text NOT NULL CHECK (btrim(context_key)<>''),
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    policy_id uuid NOT NULL,
    policy_hash platform.content_hash NOT NULL,
    context_snapshot jsonb NOT NULL CHECK (jsonb_typeof(context_snapshot)='object'),
    state text NOT NULL CHECK (state IN ('IN_PROGRESS','FINALIZED')),
    revision bigint NOT NULL CHECK (revision>0),
    started_at timestamptz NOT NULL,
    deadline_at timestamptz NOT NULL CHECK (deadline_at>started_at),
    finished_at timestamptz,
    finish_reason text CHECK (finish_reason IN ('SUBMITTED','DEADLINE')),
    previous_attempt_id uuid,
    processing_status text NOT NULL CHECK (processing_status IN ('PENDING','PROCESSED')),
    finalization_failures integer NOT NULL DEFAULT 0 CHECK (finalization_failures>=0),
    next_finalization_at timestamptz,
    finalization_error_code text,
    UNIQUE (organization_id,learner_id,id),
    UNIQUE (organization_id,learner_id,purpose,context_key,id),
    FOREIGN KEY (selection_id,organization_id,learner_id,selection_revision)
        REFERENCES platform.employee_role_selection(selection_id,organization_id,learner_id,target_revision),
    FOREIGN KEY (organization_id,purpose,policy_id)
        REFERENCES platform.assessment_rule_policy_version(organization_id,purpose,id),
    FOREIGN KEY (organization_id,learner_id,purpose,context_key,previous_attempt_id)
        REFERENCES platform.rule_assessment_attempt(organization_id,learner_id,purpose,context_key,id),
    CHECK ((state='FINALIZED')=(finished_at IS NOT NULL AND finish_reason IS NOT NULL)),
    CHECK (state='FINALIZED' OR (finished_at IS NULL AND finish_reason IS NULL)),
    CHECK (state='FINALIZED' OR processing_status='PENDING')
);
CREATE UNIQUE INDEX rule_attempt_active ON platform.rule_assessment_attempt
    (organization_id,learner_id,purpose,context_key) WHERE state='IN_PROGRESS';
CREATE INDEX rule_attempt_deadlines ON platform.rule_assessment_attempt(deadline_at,id) WHERE state='IN_PROGRESS';
CREATE INDEX rule_attempt_retry_queue ON platform.rule_assessment_attempt((coalesce(next_finalization_at,deadline_at)),id)
    WHERE state='IN_PROGRESS';
CREATE INDEX rule_attempt_processing ON platform.rule_assessment_attempt(organization_id,id)
    WHERE state='FINALIZED' AND processing_status='PENDING';
CREATE INDEX rule_attempt_history ON platform.rule_assessment_attempt(organization_id,learner_id,purpose,started_at);
CREATE INDEX rule_attempt_step_history ON platform.rule_assessment_attempt(organization_id,learner_id,
    (context_snapshot #>> '{context,requestId}'),(context_snapshot #>> '{context,stepId}'),finished_at)
    WHERE purpose='SKILL_ASSESSMENT' AND state='FINALIZED';
CREATE TABLE platform.rule_assessment_group (
    attempt_id uuid NOT NULL REFERENCES platform.rule_assessment_attempt,
    group_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    outcome_codes jsonb NOT NULL CHECK (jsonb_typeof(outcome_codes)='array' AND jsonb_array_length(outcome_codes)>0),
    group_role text NOT NULL CHECK (group_role IN ('TARGET','MAIN','PREREQUISITE')),
    total_count integer NOT NULL CHECK (total_count>0),
    required_correct_count integer NOT NULL CHECK (required_correct_count BETWEEN 1 AND total_count),
    mandatory_required boolean NOT NULL,
    all_wrong_veto boolean NOT NULL,
    PRIMARY KEY (attempt_id,group_id),
    UNIQUE (attempt_id,group_id,organization_id),
    UNIQUE (attempt_id,skill_id,knowledge_level),
    FOREIGN KEY (organization_id,learner_id,attempt_id)
        REFERENCES platform.rule_assessment_attempt(organization_id,learner_id,id)
);
CREATE TABLE platform.rule_assessment_item (
    attempt_id uuid NOT NULL,
    group_id uuid NOT NULL,
    item_position integer NOT NULL CHECK (item_position>0),
    organization_id uuid NOT NULL,
    item_version_id uuid NOT NULL,
    frozen_item jsonb NOT NULL CHECK (jsonb_typeof(frozen_item)='object'),
    mandatory boolean NOT NULL,
    PRIMARY KEY (attempt_id,item_position),
    UNIQUE (attempt_id,item_version_id),
    UNIQUE (attempt_id,group_id,item_position),
    FOREIGN KEY (attempt_id,group_id) REFERENCES platform.rule_assessment_group,
    FOREIGN KEY (attempt_id,group_id,organization_id)
        REFERENCES platform.rule_assessment_group(attempt_id,group_id,organization_id),
    FOREIGN KEY (organization_id,item_version_id)
        REFERENCES platform.assessment_item_knowledge_mapping(organization_id,item_version_id)
);
CREATE TABLE platform.rule_assessment_answer (
    attempt_id uuid NOT NULL,
    item_position integer NOT NULL,
    response jsonb NOT NULL,
    is_correct boolean NOT NULL,
    revision bigint NOT NULL CHECK (revision>0),
    accepted_at timestamptz NOT NULL,
    source_command uuid NOT NULL,
    PRIMARY KEY (attempt_id,item_position),
    FOREIGN KEY (attempt_id,item_position) REFERENCES platform.rule_assessment_item
);
CREATE TABLE platform.rule_assessment_group_result (
    attempt_id uuid NOT NULL,
    group_id uuid NOT NULL,
    correct_count integer NOT NULL CHECK (correct_count>=0),
    total_count integer NOT NULL CHECK (total_count>0 AND correct_count<=total_count),
    mandatory_satisfied boolean NOT NULL,
    passed boolean NOT NULL,
    veto_triggered boolean NOT NULL,
    reasons jsonb NOT NULL CHECK (jsonb_typeof(reasons)='array'),
    finalized_at timestamptz NOT NULL,
    PRIMARY KEY (attempt_id,group_id),
    FOREIGN KEY (attempt_id,group_id) REFERENCES platform.rule_assessment_group
);
CREATE TABLE platform.rule_assessment_command (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    operation text NOT NULL CHECK (btrim(operation)<>''),
    resource text NOT NULL CHECK (btrim(resource)<>''),
    retry_key uuid NOT NULL,
    body_hash platform.content_hash NOT NULL,
    outcome jsonb NOT NULL CHECK (jsonb_typeof(outcome)='object'),
    created_at timestamptz NOT NULL,
    UNIQUE (organization_id,actor_id,operation,resource,retry_key),
    FOREIGN KEY (actor_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
ALTER TABLE platform.rule_assessment_answer ADD CONSTRAINT rule_answer_command
    FOREIGN KEY (source_command) REFERENCES platform.rule_assessment_command DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION platform.guard_rule_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Rule assessment history is immutable' USING ERRCODE='23514'; END; $$;
DO $$ DECLARE owner text; BEGIN
    FOREACH owner IN ARRAY ARRAY['assessment_rule_policy_version','assessment_item_knowledge_mapping',
        'rule_assessment_group','rule_assessment_item','rule_assessment_group_result','rule_assessment_command']
    LOOP EXECUTE format('CREATE TRIGGER rule_history_immutable BEFORE UPDATE OR DELETE ON platform.%I
        FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_history()',owner); END LOOP;
END; $$;
CREATE FUNCTION platform.guard_rule_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Attempt history cannot be deleted' USING ERRCODE='23514'; END IF;
    IF TG_OP='INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM platform.assessment_rule_policy_activation a
            JOIN platform.assessment_rule_policy_version p ON p.id=a.current_policy_version_id
            WHERE a.organization_id=NEW.organization_id AND a.purpose=NEW.purpose
            AND p.id=NEW.policy_id AND p.configuration_hash=NEW.policy_hash)
        THEN RAISE EXCEPTION 'Attempt requires active purpose policy' USING ERRCODE='23514'; END IF;
    ELSE
        IF ROW(NEW.id,NEW.organization_id,NEW.learner_id,NEW.purpose,NEW.context_key,NEW.selection_id,
            NEW.selection_revision,NEW.policy_id,NEW.policy_hash,NEW.context_snapshot,NEW.started_at,
            NEW.deadline_at,NEW.previous_attempt_id)
            IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.learner_id,OLD.purpose,OLD.context_key,OLD.selection_id,
            OLD.selection_revision,OLD.policy_id,OLD.policy_hash,OLD.context_snapshot,OLD.started_at,
            OLD.deadline_at,OLD.previous_attempt_id)
            OR NEW.revision<>OLD.revision+1 OR (OLD.state='FINALIZED' AND
            ROW(NEW.state,NEW.finished_at,NEW.finish_reason) IS DISTINCT FROM ROW(OLD.state,OLD.finished_at,OLD.finish_reason))
        THEN RAISE EXCEPTION 'Frozen attempt or invalid revision' USING ERRCODE='23514'; END IF;
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER rule_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.rule_assessment_attempt
    FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_attempt();
CREATE FUNCTION platform.guard_rule_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a platform.rule_assessment_attempt%ROWTYPE;
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Answer history retained' USING ERRCODE='23514'; END IF;
    SELECT * INTO STRICT a FROM platform.rule_assessment_attempt WHERE id=NEW.attempt_id FOR UPDATE;
    IF a.state<>'IN_PROGRESS' OR clock_timestamp()>=a.deadline_at
        OR (TG_OP='UPDATE' AND (NEW.revision<>OLD.revision+1 OR
            ROW(NEW.attempt_id,NEW.item_position) IS DISTINCT FROM ROW(OLD.attempt_id,OLD.item_position)))
    THEN RAISE EXCEPTION 'Answer is late, final or stale' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER rule_answer_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.rule_assessment_answer
    FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_answer();
