-- Explicitly abandoned drafts retain their last saved content; active policies/attempts are unchanged.
CREATE TABLE platform.assessment_rule_abandoned_draft (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    purpose text NOT NULL CHECK (purpose IN ('BASELINE','SKILL_ASSESSMENT')),
    scope_key platform.content_hash NOT NULL,
    id uuid PRIMARY KEY,
    revision bigint NOT NULL CHECK (revision > 0),
    configuration jsonb CHECK (configuration IS NULL OR jsonb_typeof(configuration)='object'),
    editor_state jsonb CHECK (editor_state IS NULL OR jsonb_typeof(editor_state)='object'),
    catalog_hash platform.content_hash NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamptz NOT NULL,
    abandoned_by uuid NOT NULL,
    abandoned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (updated_by,organization_id) REFERENCES platform.account(account_id,organization_id),
    FOREIGN KEY (abandoned_by,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE INDEX rule_abandoned_scope_history ON platform.assessment_rule_abandoned_draft
    (organization_id,purpose,scope_key,abandoned_at DESC,id);
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON platform.assessment_rule_abandoned_draft
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
-- No existing draft is abandoned, activated or assigned a scope by this migration. No seed rows.
