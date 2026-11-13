CREATE TABLE IF NOT EXISTS platform.password_reset (
    reset_id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES platform.account(account_id) ON DELETE CASCADE,
    token_digest varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS password_reset_account_idx ON platform.password_reset(account_id);
CREATE INDEX IF NOT EXISTS password_reset_token_digest_idx ON platform.password_reset(token_digest);

