ALTER TABLE platform.target_selection
    ADD COLUMN role_snapshot jsonb;

ALTER TABLE platform.target_selection
    ADD CONSTRAINT target_selection_role_snapshot_object
    CHECK (role_snapshot IS NULL OR jsonb_typeof(role_snapshot) = 'object');

CREATE TABLE platform.target_selection_request (
    request_id uuid PRIMARY KEY,
    actor_id uuid NOT NULL REFERENCES platform.account,
    operation text NOT NULL DEFAULT 'SELECT_TARGET_ROLE'
        CHECK (operation = 'SELECT_TARGET_ROLE'),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    request_hash platform.content_hash NOT NULL,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCEEDED', 'REJECTED')),
    result_selection_id uuid,
    result_target_revision bigint CHECK (result_target_revision >= 0),
    outcome_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    FOREIGN KEY (result_selection_id, actor_id)
        REFERENCES platform.target_selection(selection_id, learner_id),
    UNIQUE (actor_id, operation, idempotency_key),
    CHECK (
        (status = 'PENDING'
            AND completed_at IS NULL
            AND result_selection_id IS NULL
            AND result_target_revision IS NULL
            AND outcome_code IS NULL)
        OR
        (status = 'SUCCEEDED'
            AND completed_at IS NOT NULL
            AND result_selection_id IS NOT NULL
            AND result_target_revision IS NOT NULL
            AND outcome_code IS NULL)
        OR
        (status = 'REJECTED'
            AND completed_at IS NOT NULL
            AND result_selection_id IS NULL
            AND result_target_revision IS NULL
            AND outcome_code IS NOT NULL
            AND btrim(outcome_code) <> '')
    )
);

CREATE INDEX target_selection_request_pending_idx
    ON platform.target_selection_request(created_at)
    WHERE status = 'PENDING';
