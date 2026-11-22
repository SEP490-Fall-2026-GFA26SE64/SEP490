-- FR-03.07: additional Employee seats purchased outside a plan change.

DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'platform.subscription_intent'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) LIKE '%PURCHASE%' LOOP
        EXECUTE format('ALTER TABLE platform.subscription_intent DROP CONSTRAINT %I', c.conname);
    END LOOP;
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'platform.payment_application'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) LIKE '%period_id%' LOOP
        EXECUTE format('ALTER TABLE platform.payment_application DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

ALTER TABLE platform.subscription_intent
    ADD CONSTRAINT subscription_intent_kind_check CHECK (kind IN ('PURCHASE', 'RENEWAL', 'SEAT_ADDON')),
    ADD CONSTRAINT subscription_intent_scope_check CHECK (
        (kind = 'PURCHASE' AND registration_id IS NOT NULL AND organization_id IS NULL)
        OR (kind IN ('RENEWAL', 'SEAT_ADDON') AND registration_id IS NULL AND organization_id IS NOT NULL));
CREATE UNIQUE INDEX subscription_unresolved_seat_addon_idx ON platform.subscription_intent(organization_id)
    WHERE kind = 'SEAT_ADDON' AND state <> 'APPLIED';

-- employee_seats/price_vnd stay the total granted/charged; addon_* is the add-on part of that total.
ALTER TABLE platform.payment_order
    ADD COLUMN addon_seats integer NOT NULL DEFAULT 0,
    ADD COLUMN addon_amount_vnd bigint NOT NULL DEFAULT 0,
    ADD COLUMN seat_addon_kind text,
    ADD COLUMN target_period_id uuid REFERENCES platform.subscription_period,
    ADD CONSTRAINT payment_order_addon_part_check CHECK (
        addon_seats BETWEEN 0 AND employee_seats AND addon_amount_vnd BETWEEN 0 AND price_vnd
        AND (addon_seats = 0) = (addon_amount_vnd = 0)),
    ADD CONSTRAINT payment_order_seat_addon_check CHECK (
        (seat_addon_kind IS NULL AND target_period_id IS NULL)
        OR (seat_addon_kind IN ('INCREASE', 'SHORTFALL') AND target_period_id IS NOT NULL
            AND addon_seats = employee_seats AND addon_amount_vnd = price_vnd));

CREATE OR REPLACE FUNCTION platform.protect_payment_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Payment order history cannot be deleted' USING ERRCODE = '23514';
    END IF;
    IF ROW(NEW.order_id, NEW.intent_id, NEW.created_by, NEW.attempt, NEW.provider_order_code,
           NEW.plan_id, NEW.plan_version_id, NEW.name, NEW.description, NEW.price_vnd, NEW.currency,
           NEW.duration_months, NEW.employee_seats, NEW.idempotency_key, NEW.request_digest,
           NEW.supersedes_order_id, NEW.created_at, NEW.expires_at,
           NEW.addon_seats, NEW.addon_amount_vnd, NEW.seat_addon_kind, NEW.target_period_id)
        IS DISTINCT FROM
       ROW(OLD.order_id, OLD.intent_id, OLD.created_by, OLD.attempt, OLD.provider_order_code,
           OLD.plan_id, OLD.plan_version_id, OLD.name, OLD.description, OLD.price_vnd, OLD.currency,
           OLD.duration_months, OLD.employee_seats, OLD.idempotency_key, OLD.request_digest,
           OLD.supersedes_order_id, OLD.created_at, OLD.expires_at,
           OLD.addon_seats, OLD.addon_amount_vnd, OLD.seat_addon_kind, OLD.target_period_id) THEN
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

-- Add-on seats the organization keeps at the next same-plan renewal.
ALTER TABLE platform.subscription
    ADD COLUMN desired_addon_seats integer NOT NULL DEFAULT 0 CHECK (desired_addon_seats >= 0);

CREATE TABLE platform.subscription_seat_addon (
    addon_id uuid PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES platform.subscription,
    period_id uuid NOT NULL REFERENCES platform.subscription_period,
    order_id uuid NOT NULL UNIQUE REFERENCES platform.payment_order,
    seats integer NOT NULL CHECK (seats > 0),
    applied_at timestamptz NOT NULL
);
CREATE INDEX subscription_seat_addon_period_idx ON platform.subscription_seat_addon(period_id);
CREATE TRIGGER subscription_seat_addon_immutable BEFORE UPDATE OR DELETE ON platform.subscription_seat_addon
    FOR EACH ROW EXECUTE FUNCTION platform.reject_subscription_history_mutation();

ALTER TABLE platform.payment_application
    ADD COLUMN seat_addon_id uuid UNIQUE REFERENCES platform.subscription_seat_addon,
    ADD CONSTRAINT payment_application_applied_check CHECK (
        (state = 'APPLIED') = (applied_at IS NOT NULL AND (period_id IS NOT NULL) <> (seat_addon_id IS NOT NULL))),
    ADD CONSTRAINT payment_application_unapplied_check CHECK (
        state = 'APPLIED' OR (applied_at IS NULL AND period_id IS NULL AND seat_addon_id IS NULL));
