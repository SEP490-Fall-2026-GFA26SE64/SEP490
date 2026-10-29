CREATE TABLE platform.organization_registration (
    registration_id uuid PRIMARY KEY,
    account_id uuid NOT NULL UNIQUE REFERENCES platform.account,
    organization_name varchar(200) NOT NULL CHECK (btrim(organization_name) <> ''),
    workspace_slug varchar(63) NOT NULL UNIQUE
        CHECK (workspace_slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
    industry text CHECK (industry IN (
        'Software Engineering & AI', 'Cloud Infrastructure & DevOps',
        'Data Engineering & Analytics', 'Cybersecurity & Network Systems',
        'Enterprise Financial Technology')),
    headcount text CHECK (headcount IN (
        '1 - 20 employees', '21 - 50 employees', '51 - 200 employees', '200+ employees')),
    admin_name varchar(120) NOT NULL CHECK (btrim(admin_name) <> ''),
    state text NOT NULL DEFAULT 'EMAIL_PENDING'
        CHECK (state IN ('EMAIL_PENDING', 'MFA_PENDING', 'REGISTERED')),
    email_verified_at timestamptz,
    completed_at timestamptz,
    auth_version bigint NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
    recovery_required boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK ((state = 'EMAIL_PENDING') = (email_verified_at IS NULL)),
    CHECK ((state = 'REGISTERED') = (completed_at IS NOT NULL))
);

CREATE TABLE platform.registration_email_verification (
    account_id uuid PRIMARY KEY REFERENCES platform.organization_registration(account_id),
    code_hmac platform.content_hash NOT NULL,
    generation bigint NOT NULL CHECK (generation > 0),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    last_sent_at timestamptz NOT NULL,
    window_started_at timestamptz NOT NULL,
    sends_in_window integer NOT NULL CHECK (sends_in_window BETWEEN 1 AND 5)
);

CREATE TABLE platform.account_totp (
    account_id uuid PRIMARY KEY REFERENCES platform.organization_registration(account_id),
    encrypted_secret text NOT NULL CHECK (encrypted_secret <> ''),
    enabled_at timestamptz NOT NULL,
    last_used_step bigint NOT NULL CHECK (last_used_step >= 0)
);

CREATE TABLE platform.account_recovery_code (
    account_id uuid NOT NULL REFERENCES platform.account_totp,
    code_hash platform.content_hash NOT NULL,
    created_at timestamptz NOT NULL,
    consumed_at timestamptz,
    PRIMARY KEY (account_id, code_hash)
);

CREATE TABLE platform.registration_rate_limit (
    bucket_key platform.content_hash PRIMARY KEY,
    window_started_at timestamptz NOT NULL,
    attempts integer NOT NULL CHECK (attempts >= 0),
    blocked_until timestamptz
);

CREATE TABLE platform.registration_session (
    primary_id char(36) PRIMARY KEY,
    session_id char(36) NOT NULL UNIQUE,
    creation_time bigint NOT NULL,
    last_access_time bigint NOT NULL,
    max_inactive_interval integer NOT NULL,
    expiry_time bigint NOT NULL,
    principal_name varchar(100)
);
CREATE INDEX registration_session_expiry_idx ON platform.registration_session(expiry_time);
CREATE INDEX registration_session_principal_idx ON platform.registration_session(principal_name);
CREATE TABLE platform.registration_session_attributes (
    session_primary_id char(36) NOT NULL REFERENCES platform.registration_session(primary_id) ON DELETE CASCADE,
    attribute_name varchar(200) NOT NULL,
    attribute_bytes bytea NOT NULL,
    PRIMARY KEY (session_primary_id, attribute_name)
);
