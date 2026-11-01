-- Working drafts never weaken the immutable published item/version contract.
CREATE TABLE platform.question_bank_workspace (
    organization_id uuid PRIMARY KEY REFERENCES platform.organization,
    question_bank_id uuid NOT NULL UNIQUE REFERENCES platform.question_bank,
    document jsonb NOT NULL CHECK(jsonb_typeof(document)='object')
);
CREATE TABLE platform.question_bank_identity (
    question_id uuid PRIMARY KEY,
    question_bank_id uuid NOT NULL REFERENCES platform.question_bank,
    code text NOT NULL CHECK(code=upper(btrim(code)) AND code<>''),
    retired boolean NOT NULL DEFAULT false,
    UNIQUE(question_bank_id,code)
);
CREATE TABLE platform.question_bank_mail (
    notice_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    recipient uuid NOT NULL REFERENCES platform.account,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','RETRY','SENT','FAILED')),
    attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
    next_attempt timestamptz NOT NULL DEFAULT now(),
    lease_owner uuid,
    lease_until timestamptz,
    error_code text
);
CREATE INDEX question_bank_mail_pending ON platform.question_bank_mail(next_attempt) WHERE status IN ('PENDING','RETRY','RUNNING');
