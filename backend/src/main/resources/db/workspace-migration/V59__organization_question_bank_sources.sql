-- One organization authoring workspace can retain questions from several owned source banks.
CREATE TABLE platform.question_bank_scope (
    organization_id uuid NOT NULL REFERENCES platform.organization,
    question_bank_id uuid NOT NULL REFERENCES platform.question_bank,
    PRIMARY KEY (organization_id,question_bank_id),
    UNIQUE (question_bank_id)
);
INSERT INTO platform.question_bank_scope(organization_id,question_bank_id)
SELECT a.organization_id,b.question_bank_id FROM platform.question_bank b
JOIN platform.account a ON a.account_id=b.created_by WHERE a.organization_id IS NOT NULL;
DO $$ DECLARE constraint_name text; BEGIN
    FOR constraint_name IN SELECT conname FROM pg_constraint
        WHERE conrelid='platform.assessment_item_knowledge_mapping'::regclass
          AND confrelid='platform.question_bank_workspace'::regclass
    LOOP EXECUTE format('ALTER TABLE platform.assessment_item_knowledge_mapping DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
ALTER TABLE platform.assessment_item_knowledge_mapping ADD CONSTRAINT assessment_mapping_owned_bank
    FOREIGN KEY (organization_id,question_bank_id) REFERENCES platform.question_bank_scope(organization_id,question_bank_id);
-- No bank/item/version is moved, deleted, reclassified or published by this migration.
