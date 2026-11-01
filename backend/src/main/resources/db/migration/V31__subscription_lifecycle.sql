CREATE TABLE platform.subscription_plan (
    plan_id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE CHECK (code = lower(btrim(code)) AND code <> ''),
    current_version_id uuid NOT NULL
);

CREATE TABLE platform.subscription_plan_version (
    version_id uuid PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES platform.subscription_plan,
    revision bigint NOT NULL CHECK (revision > 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL CHECK (btrim(description) <> ''),
    price_vnd bigint NOT NULL CHECK (price_vnd BETWEEN 1 AND 9007199254740991),
    currency varchar(3) NOT NULL CHECK (currency = 'VND'),
    duration_months integer NOT NULL CHECK (duration_months > 0),
    employee_seats integer NOT NULL CHECK (employee_seats > 0),
    created_at timestamptz NOT NULL,
    created_by uuid REFERENCES platform.account,
    creation_source text NOT NULL CHECK (creation_source IN ('SYSTEM', 'PLATFORM_ADMINISTRATOR')),
    UNIQUE (plan_id, revision),
    UNIQUE (plan_id, version_id),
    CHECK ((creation_source = 'SYSTEM') = (created_by IS NULL))
);

ALTER TABLE platform.subscription_plan
    ADD CONSTRAINT subscription_plan_current_version_fk FOREIGN KEY (plan_id, current_version_id)
    REFERENCES platform.subscription_plan_version(plan_id, version_id) DEFERRABLE INITIALLY DEFERRED;

INSERT INTO platform.subscription_plan VALUES
    ('10000000-0000-4000-8000-000000000001', 'starter', '20000000-0000-4000-8000-000000000001'),
    ('10000000-0000-4000-8000-000000000002', 'growth', '20000000-0000-4000-8000-000000000002'),
    ('10000000-0000-4000-8000-000000000003', 'enterprise', '20000000-0000-4000-8000-000000000003');

INSERT INTO platform.subscription_plan_version
    (version_id, plan_id, revision, name, description, price_vnd, currency,
     duration_months, employee_seats, created_at, created_by, creation_source)
VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1,
     'Starter', 'Organization workspace subscription for up to 20 Employee seats.',
     4900000, 'VND', 1, 20, now(), NULL, 'SYSTEM'),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1,
     'Growth', 'Organization workspace subscription for up to 50 Employee seats.',
     12250000, 'VND', 1, 50, now(), NULL, 'SYSTEM'),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 1,
     'Enterprise', 'Organization workspace subscription for up to 200 Employee seats.',
     24500000, 'VND', 1, 200, now(), NULL, 'SYSTEM');

CREATE FUNCTION platform.reject_subscription_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Subscription commercial history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER subscription_plan_version_immutable
    BEFORE UPDATE OR DELETE ON platform.subscription_plan_version
    FOR EACH ROW EXECUTE FUNCTION platform.reject_subscription_history_mutation();

CREATE SEQUENCE platform.payos_order_code_seq
    AS bigint MINVALUE 1 MAXVALUE 9007199254740991 START WITH 1000000000000 NO CYCLE;

CREATE TABLE platform.subscription_intent (
    intent_id uuid PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('PURCHASE', 'RENEWAL')),
    state text NOT NULL DEFAULT 'OPEN'
        CHECK (state IN ('OPEN', 'APPLYING', 'WAITING_CAPACITY', 'APPLIED', 'EXCEPTION')),
    registration_id uuid REFERENCES platform.organization_registration,
    organization_id uuid REFERENCES platform.organization,
    owner_account_id uuid NOT NULL REFERENCES platform.account,
    applied_order_id uuid,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK ((kind = 'PURCHASE' AND registration_id IS NOT NULL AND organization_id IS NULL)
        OR (kind = 'RENEWAL' AND registration_id IS NULL AND organization_id IS NOT NULL)),
    CHECK ((state = 'APPLIED') = (applied_order_id IS NOT NULL))
);
CREATE UNIQUE INDEX subscription_initial_intent_idx ON platform.subscription_intent(registration_id)
    WHERE kind = 'PURCHASE';
CREATE UNIQUE INDEX subscription_unresolved_renewal_idx ON platform.subscription_intent(organization_id)
    WHERE kind = 'RENEWAL' AND state <> 'APPLIED';

CREATE TABLE platform.payment_order (
    order_id uuid PRIMARY KEY,
    intent_id uuid NOT NULL REFERENCES platform.subscription_intent,
    created_by uuid NOT NULL REFERENCES platform.account,
    attempt integer NOT NULL CHECK (attempt > 0),
    provider_order_code bigint NOT NULL DEFAULT nextval('platform.payos_order_code_seq')
        UNIQUE CHECK (provider_order_code BETWEEN 1 AND 9007199254740991),
    plan_id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL CHECK (btrim(description) <> ''),
    price_vnd bigint NOT NULL CHECK (price_vnd BETWEEN 1 AND 9007199254740991),
    currency varchar(3) NOT NULL CHECK (currency = 'VND'),
    duration_months integer NOT NULL CHECK (duration_months > 0),
    employee_seats integer NOT NULL CHECK (employee_seats > 0),
    idempotency_key uuid NOT NULL,
    request_digest platform.content_hash NOT NULL,
    payment_status text NOT NULL DEFAULT 'CREATING'
        CHECK (payment_status IN ('CREATING', 'PENDING', 'UNKNOWN', 'PARTIAL', 'PAID', 'UNPAID_TERMINAL', 'EXCEPTION')),
    provider_status text,
    payment_link_id text UNIQUE,
    checkout_url text,
    observed_paid_amount bigint CHECK (observed_paid_amount >= 0),
    paid_at timestamptz,
    last_checked_at timestamptz,
    failure_code text,
    supersedes_order_id uuid,
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    UNIQUE (created_by, idempotency_key),
    UNIQUE (intent_id, attempt),
    UNIQUE (intent_id, order_id),
    FOREIGN KEY (plan_id, plan_version_id)
        REFERENCES platform.subscription_plan_version(plan_id, version_id),
    FOREIGN KEY (intent_id, supersedes_order_id) REFERENCES platform.payment_order(intent_id, order_id),
    CHECK (expires_at = created_at + interval '30 minutes'),
    CHECK (supersedes_order_id IS DISTINCT FROM order_id),
    CHECK (payment_status <> 'UNPAID_TERMINAL' OR (observed_paid_amount IS NOT NULL AND observed_paid_amount = 0)),
    CHECK (payment_status <> 'PAID' OR
        (observed_paid_amount IS NOT NULL AND observed_paid_amount = price_vnd AND paid_at IS NOT NULL))
);
CREATE UNIQUE INDEX payment_one_open_attempt_idx ON platform.payment_order(intent_id)
    WHERE payment_status IN ('CREATING', 'PENDING', 'UNKNOWN', 'PARTIAL');
CREATE INDEX payment_reconciliation_idx ON platform.payment_order(last_checked_at, created_at)
    WHERE payment_status IN ('CREATING', 'PENDING', 'UNKNOWN', 'PARTIAL');
ALTER TABLE platform.subscription_intent
    ADD CONSTRAINT subscription_intent_applied_order_fk FOREIGN KEY (intent_id, applied_order_id)
    REFERENCES platform.payment_order(intent_id, order_id);

CREATE FUNCTION platform.protect_payment_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Payment order history cannot be deleted' USING ERRCODE = '23514';
    END IF;
    IF ROW(NEW.order_id, NEW.intent_id, NEW.created_by, NEW.attempt, NEW.provider_order_code,
           NEW.plan_id, NEW.plan_version_id, NEW.name, NEW.description, NEW.price_vnd, NEW.currency,
           NEW.duration_months, NEW.employee_seats, NEW.idempotency_key, NEW.request_digest,
           NEW.supersedes_order_id, NEW.created_at, NEW.expires_at)
        IS DISTINCT FROM
       ROW(OLD.order_id, OLD.intent_id, OLD.created_by, OLD.attempt, OLD.provider_order_code,
           OLD.plan_id, OLD.plan_version_id, OLD.name, OLD.description, OLD.price_vnd, OLD.currency,
           OLD.duration_months, OLD.employee_seats, OLD.idempotency_key, OLD.request_digest,
           OLD.supersedes_order_id, OLD.created_at, OLD.expires_at) THEN
        RAISE EXCEPTION 'Payment purchase terms are immutable' USING ERRCODE = '23514';
    END IF;
    IF OLD.payment_link_id IS NOT NULL AND NEW.payment_link_id IS DISTINCT FROM OLD.payment_link_id THEN
        RAISE EXCEPTION 'A verified provider link cannot be rebound' USING ERRCODE = '23514';
    END IF;
    IF OLD.payment_status = 'PAID' AND NEW.payment_status <> 'PAID' THEN
        RAISE EXCEPTION 'Confirmed payment cannot be downgraded' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_snapshot_immutable BEFORE UPDATE OR DELETE ON platform.payment_order
    FOR EACH ROW EXECUTE FUNCTION platform.protect_payment_order_snapshot();

CREATE TABLE platform.payment_observation (
    observation_id uuid PRIMARY KEY,
    order_id uuid REFERENCES platform.payment_order,
    provider_order_code bigint NOT NULL,
    provider_reference text,
    payment_link_id text,
    amount bigint CHECK (amount >= 0),
    currency text,
    observed_status text NOT NULL,
    payload_digest platform.content_hash NOT NULL,
    source text NOT NULL CHECK (source IN ('CREATE', 'QUERY', 'WEBHOOK')),
    received_at timestamptz NOT NULL,
    provider_paid_at timestamptz,
    disposition text NOT NULL CHECK (disposition IN ('RECORDED', 'QUARANTINED', 'MISMATCH')),
    UNIQUE (source, provider_order_code, payload_digest)
);
CREATE INDEX payment_observation_order_idx ON platform.payment_observation(order_id, received_at);
CREATE TRIGGER payment_observation_immutable BEFORE UPDATE OR DELETE ON platform.payment_observation
    FOR EACH ROW EXECUTE FUNCTION platform.reject_subscription_history_mutation();

CREATE TABLE platform.organization_workspace (
    workspace_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL UNIQUE REFERENCES platform.organization,
    registration_id uuid NOT NULL UNIQUE REFERENCES platform.organization_registration,
    slug varchar(63) NOT NULL UNIQUE,
    setup_state text NOT NULL CHECK (setup_state IN ('PROVISIONING', 'READY', 'FAILED')),
    created_at timestamptz NOT NULL,
    ready_at timestamptz,
    failure_code text,
    CHECK ((setup_state = 'READY') = (ready_at IS NOT NULL))
);

CREATE TABLE platform.subscription (
    subscription_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL UNIQUE REFERENCES platform.organization,
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at timestamptz NOT NULL
);
CREATE TABLE platform.subscription_period (
    period_id uuid PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES platform.subscription,
    order_id uuid NOT NULL UNIQUE REFERENCES platform.payment_order,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    billing_zone text NOT NULL CHECK (billing_zone = 'Asia/Ho_Chi_Minh'),
    anniversary_day integer NOT NULL CHECK (anniversary_day BETWEEN 1 AND 31),
    created_at timestamptz NOT NULL,
    CHECK (ends_at > starts_at)
);
CREATE INDEX subscription_period_boundary_idx ON platform.subscription_period(subscription_id, starts_at, ends_at);
CREATE TRIGGER subscription_period_immutable BEFORE UPDATE OR DELETE ON platform.subscription_period
    FOR EACH ROW EXECUTE FUNCTION platform.reject_subscription_history_mutation();

CREATE TABLE platform.payment_application (
    application_id uuid PRIMARY KEY,
    order_id uuid NOT NULL UNIQUE REFERENCES platform.payment_order,
    intent_id uuid NOT NULL UNIQUE REFERENCES platform.subscription_intent,
    state text NOT NULL CHECK (state IN ('PENDING', 'WAITING_CAPACITY', 'APPLIED', 'EXCEPTION')),
    period_id uuid UNIQUE REFERENCES platform.subscription_period,
    applied_at timestamptz,
    failure_code text,
    updated_at timestamptz NOT NULL,
    FOREIGN KEY (intent_id, order_id) REFERENCES platform.payment_order(intent_id, order_id),
    CHECK ((state = 'APPLIED') = (applied_at IS NOT NULL AND period_id IS NOT NULL)),
    CHECK (state = 'APPLIED' OR (applied_at IS NULL AND period_id IS NULL))
);

CREATE TABLE platform.department_reference (
    department_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    name text NOT NULL CHECK (btrim(name) <> ''),
    active boolean NOT NULL,
    UNIQUE (department_id, organization_id)
);
CREATE TABLE platform.occupation_department_reference (
    occupation_reference_id uuid PRIMARY KEY,
    occupation_id uuid NOT NULL,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    department_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    active boolean NOT NULL,
    UNIQUE (occupation_id, organization_id),
    UNIQUE (occupation_reference_id, department_id, organization_id),
    FOREIGN KEY (department_id, organization_id)
        REFERENCES platform.department_reference(department_id, organization_id)
);

ALTER TABLE platform.account ADD CONSTRAINT account_identity_organization_key UNIQUE (account_id, organization_id);

CREATE TABLE platform.organization_membership (
    membership_id uuid PRIMARY KEY,
    account_id uuid NOT NULL UNIQUE REFERENCES platform.account,
    organization_id uuid NOT NULL REFERENCES platform.organization,
    active boolean NOT NULL,
    department_id uuid,
    occupation_reference_id uuid,
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    UNIQUE (membership_id, organization_id),
    FOREIGN KEY (account_id, organization_id) REFERENCES platform.account(account_id, organization_id),
    FOREIGN KEY (department_id, organization_id)
        REFERENCES platform.department_reference(department_id, organization_id),
    FOREIGN KEY (occupation_reference_id, department_id, organization_id)
        REFERENCES platform.occupation_department_reference(occupation_reference_id, department_id, organization_id),
    CHECK (occupation_reference_id IS NULL OR department_id IS NOT NULL)
);
CREATE INDEX organization_membership_org_idx ON platform.organization_membership(organization_id, active);
CREATE TABLE platform.organization_membership_role (
    membership_id uuid NOT NULL REFERENCES platform.organization_membership,
    role_code text NOT NULL CHECK (role_code IN
        ('EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER', 'ORGANIZATION_ADMINISTRATOR')),
    PRIMARY KEY (membership_id, role_code)
);
CREATE TABLE platform.platform_administrator (
    account_id uuid PRIMARY KEY REFERENCES platform.account,
    granted_at timestamptz NOT NULL,
    granted_by uuid REFERENCES platform.account,
    grant_source text NOT NULL CHECK (grant_source IN ('OPERATOR', 'PLATFORM_ADMINISTRATOR')),
    CHECK ((grant_source = 'OPERATOR') = (granted_by IS NULL))
);

CREATE FUNCTION platform.validate_employee_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    target uuid;
BEGIN
    target := COALESCE(NEW.membership_id, OLD.membership_id);
    IF EXISTS (
        SELECT 1 FROM platform.organization_membership m
        JOIN platform.organization_membership_role r USING (membership_id)
        WHERE m.membership_id = target AND r.role_code = 'EMPLOYEE'
            AND (m.department_id IS NULL OR m.occupation_reference_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Employee department and occupation references are required' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER employee_membership_assignment_guard
    AFTER INSERT OR UPDATE ON platform.organization_membership DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION platform.validate_employee_assignment();
CREATE CONSTRAINT TRIGGER employee_role_assignment_guard
    AFTER INSERT OR UPDATE ON platform.organization_membership_role DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION platform.validate_employee_assignment();
