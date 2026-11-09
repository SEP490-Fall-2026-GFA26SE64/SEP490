-- r3: official evidence is independent of baseline diagnostics and bypass decisions.
CREATE TABLE platform.skill_knowledge_evidence (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    requirement_snapshot jsonb NOT NULL CHECK (jsonb_typeof(requirement_snapshot)='object'),
    source_kind text NOT NULL CHECK (source_kind IN ('MODULE_ASSESSMENT','CERTIFICATE')),
    source_id uuid NOT NULL,
    source_version bigint NOT NULL CHECK (source_version>0),
    achieved_at timestamptz NOT NULL,
    UNIQUE (organization_id,learner_id,id),
    UNIQUE (organization_id,learner_id,skill_id,knowledge_level,source_kind,source_id,source_version),
    FOREIGN KEY (learner_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.skill_knowledge_review (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    skill_id text NOT NULL,
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    attempt_id uuid NOT NULL,
    group_id uuid NOT NULL,
    state text NOT NULL CHECK (state IN ('NEED_REVIEW','RESOLVED')),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    created_at timestamptz NOT NULL,
    resolved_by_evidence_id uuid,
    UNIQUE (attempt_id,group_id),
    FOREIGN KEY (organization_id,learner_id,attempt_id)
        REFERENCES platform.rule_assessment_attempt(organization_id,learner_id,id),
    FOREIGN KEY (attempt_id,group_id) REFERENCES platform.rule_assessment_group,
    FOREIGN KEY (organization_id,learner_id,resolved_by_evidence_id)
        REFERENCES platform.skill_knowledge_evidence(organization_id,learner_id,id),
    CHECK ((state='RESOLVED')=(resolved_by_evidence_id IS NOT NULL))
);
CREATE INDEX skill_knowledge_evidence_owner ON platform.skill_knowledge_evidence(organization_id,learner_id,skill_id,knowledge_level,achieved_at DESC);
CREATE INDEX skill_knowledge_review_owner ON platform.skill_knowledge_review(organization_id,learner_id,state,created_at DESC);
CREATE TABLE platform.learning_completion_requirement (
    organization_id text NOT NULL,
    learner_id text NOT NULL,
    module_id text NOT NULL,
    revision integer NOT NULL,
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    requirement_snapshot jsonb NOT NULL CHECK (jsonb_typeof(requirement_snapshot)='object'),
    PRIMARY KEY (organization_id,learner_id,module_id,revision),
    FOREIGN KEY (organization_id,learner_id,module_id,revision)
        REFERENCES platform.learning_module_completion
);
CREATE TABLE platform.certificate_submission (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    knowledge_level text NOT NULL CHECK (knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED')),
    definition_id text NOT NULL CHECK (btrim(definition_id)<>''),
    definition_version text NOT NULL CHECK (btrim(definition_version)<>''),
    definition_snapshot jsonb NOT NULL CHECK (jsonb_typeof(definition_snapshot)='object'),
    revision bigint NOT NULL CHECK (revision>0),
    status text NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    submitted_at timestamptz NOT NULL,
    replaces_submission_id uuid,
    UNIQUE (organization_id,learner_id,id),
    UNIQUE (organization_id,id,revision),
    FOREIGN KEY (learner_id,organization_id) REFERENCES platform.account(account_id,organization_id),
    FOREIGN KEY (organization_id,learner_id,replaces_submission_id)
        REFERENCES platform.certificate_submission(organization_id,learner_id,id)
);
CREATE TABLE platform.certificate_submission_attachment (
    submission_id uuid PRIMARY KEY REFERENCES platform.certificate_submission,
    evidence_kind text NOT NULL CHECK (evidence_kind IN ('LINK','PDF','IMAGE')),
    https_url text,
    private_object_key text,
    media_type text,
    byte_size bigint,
    content_hash platform.content_hash,
    CHECK ((evidence_kind='LINK' AND https_url IS NOT NULL AND https_url ~ '^https://[^[:space:]]+$'
        AND private_object_key IS NULL AND media_type IS NULL AND byte_size IS NULL AND content_hash IS NULL)
        OR (evidence_kind IN ('PDF','IMAGE') AND https_url IS NULL AND private_object_key IS NOT NULL
        AND btrim(private_object_key)<>'' AND byte_size IS NOT NULL AND byte_size>0 AND byte_size<=10485760
        AND content_hash IS NOT NULL AND media_type IS NOT NULL
        AND ((evidence_kind='PDF' AND media_type='application/pdf')
        OR (evidence_kind='IMAGE' AND media_type IN ('image/png','image/jpeg')))))
);
CREATE TABLE platform.certificate_submission_decision (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    submission_revision bigint NOT NULL,
    decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
    expert_id uuid NOT NULL,
    assignment_snapshot jsonb NOT NULL CHECK (jsonb_typeof(assignment_snapshot)='object'),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    decided_at timestamptz NOT NULL,
    retry_key uuid NOT NULL,
    UNIQUE (submission_id,submission_revision),
    UNIQUE (organization_id,expert_id,retry_key),
    FOREIGN KEY (organization_id,submission_id,submission_revision)
        REFERENCES platform.certificate_submission(organization_id,id,revision),
    FOREIGN KEY (expert_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE INDEX certificate_review_queue ON platform.certificate_submission(organization_id,status,submitted_at);
CREATE INDEX certificate_submission_pathway ON platform.certificate_submission(organization_id,learner_id,(definition_snapshot->>'requestId'),(definition_snapshot->>'stepId'),submitted_at DESC);
CREATE UNIQUE INDEX certificate_submission_one_pending ON platform.certificate_submission(organization_id,learner_id,(definition_snapshot->>'requestId'),(definition_snapshot->>'stepId')) WHERE status='PENDING';
CREATE UNIQUE INDEX certificate_submission_replacement_chain ON platform.certificate_submission(organization_id,learner_id,replaces_submission_id) WHERE replaces_submission_id IS NOT NULL;
CREATE OR REPLACE FUNCTION platform.guard_certificate_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Certificate submissions cannot be deleted' USING ERRCODE='23514'; END IF;
    IF ROW(NEW.id,NEW.organization_id,NEW.learner_id,NEW.skill_id,NEW.knowledge_level,NEW.definition_id,NEW.definition_version,
        NEW.definition_snapshot,NEW.revision,NEW.submitted_at,NEW.replaces_submission_id)
        IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.learner_id,OLD.skill_id,OLD.knowledge_level,OLD.definition_id,OLD.definition_version,
        OLD.definition_snapshot,OLD.revision,OLD.submitted_at,OLD.replaces_submission_id)
        OR OLD.status<>'PENDING' OR NEW.status NOT IN ('APPROVED','REJECTED')
    THEN RAISE EXCEPTION 'Submitted certificate evidence is immutable; only one decision is accepted' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER certificate_submission_history BEFORE UPDATE OR DELETE ON platform.certificate_submission
    FOR EACH ROW EXECUTE FUNCTION platform.guard_certificate_submission();
DO $$ DECLARE owner text; BEGIN
    FOREACH owner IN ARRAY ARRAY['skill_knowledge_evidence','learning_completion_requirement',
        'certificate_submission_attachment','certificate_submission_decision']
    LOOP EXECUTE format('CREATE TRIGGER rule_history_immutable BEFORE UPDATE OR DELETE ON platform.%I
        FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_history()',owner); END LOOP;
END; $$;
