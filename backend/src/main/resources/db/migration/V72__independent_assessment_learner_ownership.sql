-- Independent attempts have no Role selection FK to establish learner ownership.
-- Preserve Role history and require a real account in the same organization for both contexts.
ALTER TABLE platform.rule_assessment_attempt
    ADD CONSTRAINT rule_attempt_learner_account_fk FOREIGN KEY(learner_id,organization_id)
    REFERENCES platform.account(account_id,organization_id);
