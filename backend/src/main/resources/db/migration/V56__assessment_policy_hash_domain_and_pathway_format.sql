-- Preserve the domain of already frozen policy hashes without rewriting configurations or receipts.
ALTER TABLE platform.assessment_rule_policy_version
    ADD COLUMN hash_domain text NOT NULL DEFAULT 'RULE_R3'
        CHECK (hash_domain IN ('RULE_R3','ASSESSMENT_POLICY_V1'));
ALTER TABLE platform.assessment_rule_policy_version
    ALTER COLUMN hash_domain SET DEFAULT 'ASSESSMENT_POLICY_V1';

-- New requests use a functional format name. Historical requests and their immutable inputs retain their format.
ALTER TABLE platform.initial_pathway_request
    DROP CONSTRAINT initial_pathway_request_flow_version_check,
    DROP CONSTRAINT initial_flow_snapshot_shape;
ALTER TABLE platform.initial_pathway_request
    ADD CONSTRAINT initial_pathway_request_flow_version_check
        CHECK (flow_version IN ('NUMERIC_V1','RULE_R3','REQUIREMENT_V1')),
    ADD CONSTRAINT initial_flow_snapshot_shape CHECK
        ((flow_version='NUMERIC_V1' AND gap_snapshot_id IS NOT NULL AND requirement_snapshot_id IS NULL)
        OR (flow_version IN ('RULE_R3','REQUIREMENT_V1') AND gap_snapshot_id IS NULL AND requirement_snapshot_id IS NOT NULL));
