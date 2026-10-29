CREATE TABLE platform.baseline_answer_reveal_audit (
    answer_reveal_audit_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization(organization_id),
    assessment_version_id uuid NOT NULL REFERENCES platform.assessment_version(assessment_version_id),
    actor_id uuid NOT NULL REFERENCES platform.account(account_id),
    revealed_at timestamptz NOT NULL,
    item_count integer NOT NULL CHECK (item_count > 0)
);

CREATE INDEX idx_baseline_answer_reveal_audit_assessment
    ON platform.baseline_answer_reveal_audit (organization_id, assessment_version_id, revealed_at DESC);
