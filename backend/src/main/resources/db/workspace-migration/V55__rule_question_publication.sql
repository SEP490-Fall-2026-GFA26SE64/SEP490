-- Allow explicit knowledge-mapped questions without fabricating legacy difficulty.
ALTER TABLE platform.item_version DROP CONSTRAINT item_version_baseline_metadata_complete;
ALTER TABLE platform.item_version ADD CONSTRAINT item_version_metadata_complete CHECK (
    (micro_skill_id IS NULL AND micro_skill_name_snapshot IS NULL AND difficulty IS NULL)
    OR (micro_skill_id IS NOT NULL AND btrim(micro_skill_id)<>''
        AND micro_skill_name_snapshot IS NOT NULL AND btrim(micro_skill_name_snapshot)<>''));
CREATE FUNCTION platform.require_rule_question_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.publication_state='PUBLISHED' AND NEW.micro_skill_id IS NOT NULL AND NEW.difficulty IS NULL
        AND NOT EXISTS (SELECT 1 FROM platform.assessment_item_knowledge_mapping m
            WHERE m.item_version_id=NEW.item_version_id AND m.question_bank_id=NEW.question_bank_id
                AND m.skill_id=NEW.micro_skill_id)
    THEN RAISE EXCEPTION 'Rule question publication needs exact knowledge mapping' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER rule_question_mapping_required AFTER INSERT OR UPDATE ON platform.item_version
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.require_rule_question_mapping();
