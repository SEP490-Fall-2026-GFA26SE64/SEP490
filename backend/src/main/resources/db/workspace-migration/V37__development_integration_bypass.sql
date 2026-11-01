ALTER TABLE platform.organization_registration
    ADD COLUMN email_verification_bypassed boolean NOT NULL DEFAULT false,
    ADD COLUMN mfa_bypassed boolean NOT NULL DEFAULT false;

DO $$
DECLARE constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid='platform.organization_registration'::regclass AND contype='c'
          AND (pg_get_constraintdef(oid) LIKE '%email_verified_at%'
            OR pg_get_constraintdef(oid) LIKE '%completed_at%')
    LOOP
        EXECUTE format('ALTER TABLE platform.organization_registration DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END;
$$;

ALTER TABLE platform.organization_registration
    ADD CONSTRAINT registration_email_progress CHECK (
        (state='EMAIL_PENDING') = (email_verified_at IS NULL AND NOT email_verification_bypassed)),
    ADD CONSTRAINT registration_completion CHECK (state<>'REGISTERED' OR completed_at IS NOT NULL),
    ADD CONSTRAINT registration_email_bypass_truth CHECK (
        NOT email_verification_bypassed OR email_verified_at IS NULL);

ALTER TABLE platform.payment_order DROP CONSTRAINT payment_order_payment_status_check;
ALTER TABLE platform.payment_order
    ADD COLUMN development_bypassed_at timestamptz,
    ADD CONSTRAINT payment_order_payment_status_check CHECK (payment_status IN (
        'CREATING','PENDING','UNKNOWN','PARTIAL','PAID','UNPAID_TERMINAL','EXCEPTION','DEV_BYPASSED')),
    ADD CONSTRAINT payment_development_bypass_truth CHECK (
        (payment_status='DEV_BYPASSED') = (development_bypassed_at IS NOT NULL)
        AND (payment_status<>'DEV_BYPASSED' OR (
            observed_paid_amount IS NULL AND paid_at IS NULL AND payment_link_id IS NULL
            AND checkout_url IS NULL AND provider_status IS NULL)));
