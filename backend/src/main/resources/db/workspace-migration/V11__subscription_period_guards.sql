CREATE FUNCTION platform.reject_overlapping_subscription_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM subscription_id FROM platform.subscription WHERE subscription_id=NEW.subscription_id FOR UPDATE;
    IF EXISTS (
        SELECT 1 FROM platform.subscription_period
        WHERE subscription_id=NEW.subscription_id AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
    ) THEN
        RAISE EXCEPTION 'Paid periods cannot overlap' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER subscription_period_overlap_guard BEFORE INSERT ON platform.subscription_period
    FOR EACH ROW EXECUTE FUNCTION platform.reject_overlapping_subscription_period();

CREATE INDEX payment_observation_reference_idx ON platform.payment_observation(provider_reference)
    WHERE provider_reference IS NOT NULL;
