-- Forward-only scoped configuration. Legacy policy IDs, hashes and attempt FKs are retained.
ALTER TABLE platform.assessment_rule_policy_version ADD COLUMN scope_key platform.content_hash;
ALTER TABLE platform.assessment_rule_policy_version ADD COLUMN catalog_hash platform.content_hash;
ALTER TABLE platform.assessment_rule_policy_version ADD CONSTRAINT rule_policy_scope_metadata
    CHECK ((scope_key IS NULL) = (catalog_hash IS NULL));
ALTER TABLE platform.assessment_rule_policy_version ADD CONSTRAINT rule_policy_scope_identity
    UNIQUE (organization_id,purpose,scope_key,id);
CREATE INDEX rule_policy_scope_versions ON platform.assessment_rule_policy_version
    (organization_id,purpose,scope_key,version DESC) WHERE scope_key IS NOT NULL;

CREATE TABLE platform.assessment_rule_policy_draft (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    scope_key platform.content_hash NOT NULL,
    id uuid NOT NULL UNIQUE,
    revision bigint NOT NULL CHECK (revision > 0),
    configuration jsonb CHECK (configuration IS NULL OR jsonb_typeof(configuration)='object'),
    catalog_hash platform.content_hash NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id,purpose,scope_key),
    FOREIGN KEY (updated_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE TABLE platform.assessment_rule_scoped_activation (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    scope_key platform.content_hash NOT NULL,
    current_policy_version_id uuid NOT NULL,
    revision bigint NOT NULL CHECK (revision > 0),
    changed_by uuid NOT NULL,
    changed_at timestamptz NOT NULL,
    PRIMARY KEY (organization_id,purpose,scope_key),
    FOREIGN KEY (organization_id,purpose,scope_key,current_policy_version_id)
        REFERENCES platform.assessment_rule_policy_version(organization_id,purpose,scope_key,id),
    FOREIGN KEY (changed_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
-- No scope assignment, policy cloning, activation, default threshold or seed data is inferred.
-- New admissions require the exact scoped pointer; existing attempts retain all frozen-update guards.
CREATE OR REPLACE FUNCTION platform.guard_rule_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Attempt history cannot be deleted' USING ERRCODE='23514'; END IF;
    IF TG_OP='INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM platform.assessment_rule_scoped_activation a
            JOIN platform.assessment_rule_policy_version p ON p.id=a.current_policy_version_id
                AND p.organization_id=a.organization_id AND p.purpose=a.purpose AND p.scope_key=a.scope_key
            WHERE a.organization_id=NEW.organization_id AND a.purpose=NEW.purpose
                AND a.scope_key=(NEW.context_snapshot #>> '{context,policyScopeKey}')
                AND p.id=NEW.policy_id AND p.configuration_hash=NEW.policy_hash)
        THEN RAISE EXCEPTION 'Attempt requires active scoped policy' USING ERRCODE='23514'; END IF;
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
