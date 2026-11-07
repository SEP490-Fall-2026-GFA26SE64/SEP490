-- Scope-local version labels; immutable policy identities/configurations and learner FKs stay intact.
-- PostgreSQL Flyway executes this migration transactionally. Old API writers must be stopped first.
LOCK TABLE platform.assessment_rule_policy_version IN ACCESS EXCLUSIVE MODE;

CREATE TABLE platform.assessment_rule_policy_version_number_history (
    policy_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    purpose text NOT NULL,
    scope_key platform.content_hash NOT NULL,
    previous_version bigint NOT NULL CHECK (previous_version > 0),
    scoped_version bigint NOT NULL CHECK (scoped_version > 0),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (organization_id,purpose,scope_key,policy_id)
        REFERENCES platform.assessment_rule_policy_version(organization_id,purpose,scope_key,id)
);
INSERT INTO platform.assessment_rule_policy_version_number_history
    (policy_id,organization_id,purpose,scope_key,previous_version,scoped_version)
SELECT id,organization_id,purpose,scope_key,version,
    row_number() OVER (PARTITION BY organization_id,purpose,scope_key ORDER BY version,id)
FROM platform.assessment_rule_policy_version WHERE scope_key IS NOT NULL;

-- Original constraint name is PostgreSQL-truncated; resolve the exact column key without CASCADE.
DO $$ DECLARE old_key record; BEGIN
    FOR old_key IN SELECT conname FROM pg_constraint
        WHERE conrelid='platform.assessment_rule_policy_version'::regclass AND contype='u'
          AND pg_get_constraintdef(oid)='UNIQUE (organization_id, purpose, version)'
    LOOP EXECUTE format('ALTER TABLE platform.assessment_rule_policy_version DROP CONSTRAINT %I',old_key.conname); END LOOP;
END; $$;

-- This bounded migration alone changes the display number. Restore immutability before commit.
ALTER TABLE platform.assessment_rule_policy_version DISABLE TRIGGER rule_history_immutable;
UPDATE platform.assessment_rule_policy_version p SET version=h.scoped_version
FROM platform.assessment_rule_policy_version_number_history h
WHERE p.id=h.policy_id AND p.version IS DISTINCT FROM h.scoped_version;
ALTER TABLE platform.assessment_rule_policy_version ENABLE TRIGGER rule_history_immutable;

CREATE UNIQUE INDEX rule_policy_scoped_version_number ON platform.assessment_rule_policy_version
    (organization_id,purpose,scope_key,version) WHERE scope_key IS NOT NULL;
-- Retained organization-wide legacy inputs remain in a separate, unchanged null-scope namespace.
CREATE UNIQUE INDEX rule_policy_legacy_version_number ON platform.assessment_rule_policy_version
    (organization_id,purpose,version) WHERE scope_key IS NULL;
CREATE TRIGGER rule_version_number_history_immutable BEFORE UPDATE OR DELETE
    ON platform.assessment_rule_policy_version_number_history
    FOR EACH ROW EXECUTE FUNCTION platform.guard_rule_history();
-- Frozen attempt snapshots, command receipts, hashes, activation pointers and revisions are never rewritten.
