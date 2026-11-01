CREATE TABLE platform.workspace_account_profile (
    account_id uuid PRIMARY KEY REFERENCES platform.account,
    full_name varchar(120) NOT NULL CHECK (btrim(full_name) <> ''),
    email_verified_at timestamptz NOT NULL,
    auth_version bigint NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
    recovery_required boolean NOT NULL DEFAULT false
);

ALTER TABLE platform.account_totp DROP CONSTRAINT account_totp_account_id_fkey;
ALTER TABLE platform.account_totp ADD CONSTRAINT account_totp_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES platform.account(account_id);

CREATE TABLE platform.workspace_activation (
    activation_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    created_by uuid NOT NULL REFERENCES platform.account,
    full_name varchar(120) NOT NULL CHECK (btrim(full_name) <> ''),
    email varchar(254) NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
    roles text[] NOT NULL CHECK (cardinality(roles) > 0 AND array_position(roles, NULL) IS NULL
        AND roles <@ ARRAY['EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER', 'ORGANIZATION_ADMINISTRATOR']::text[]),
    department_id uuid,
    occupation_reference_id uuid,
    proof_hash platform.content_hash NOT NULL UNIQUE,
    generation bigint NOT NULL CHECK (generation > 0),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    last_sent_at timestamptz NOT NULL,
    consumed_at timestamptz,
    account_id uuid REFERENCES platform.account,
    FOREIGN KEY (department_id, organization_id)
        REFERENCES platform.department_reference(department_id, organization_id),
    FOREIGN KEY (occupation_reference_id, department_id, organization_id)
        REFERENCES platform.occupation_department_reference(occupation_reference_id, department_id, organization_id),
    CHECK (occupation_reference_id IS NULL OR department_id IS NOT NULL),
    CHECK (NOT ('EMPLOYEE' = ANY(roles)) OR (department_id IS NOT NULL AND occupation_reference_id IS NOT NULL)),
    CHECK ((consumed_at IS NULL) = (account_id IS NULL)),
    CHECK (expires_at = last_sent_at + interval '10 minutes')
);
CREATE UNIQUE INDEX workspace_pending_activation_email_idx
    ON platform.workspace_activation(email) WHERE consumed_at IS NULL;
