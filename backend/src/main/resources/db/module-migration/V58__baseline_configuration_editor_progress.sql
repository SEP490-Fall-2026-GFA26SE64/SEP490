-- Partial staff editor state is separate from the executable policy and immutable history.
ALTER TABLE platform.assessment_rule_policy_draft ADD COLUMN editor_state jsonb;
ALTER TABLE platform.assessment_rule_policy_draft ADD CONSTRAINT rule_draft_editor_state
    CHECK (editor_state IS NULL OR (purpose='BASELINE' AND jsonb_typeof(editor_state)='object'));
-- No default policies, completed editors, bank classifications or seed data are inferred.
