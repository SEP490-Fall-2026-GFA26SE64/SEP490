-- Resolve the trigger row field before reading it. A CASE expression that mentions
-- NEW.actor_id is invalid for baseline_blueprint_working_revision, which only has
-- NEW.updated_by, even when PostgreSQL would select the other CASE branch.
CREATE OR REPLACE FUNCTION platform.validate_baseline_management_actor()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    actor_id uuid;
    actor_organization_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'baseline_assessment_transition' THEN
        actor_id := NEW.actor_id;
    ELSIF TG_TABLE_NAME = 'baseline_blueprint_working_revision' THEN
        actor_id := NEW.updated_by;
    ELSE
        RAISE EXCEPTION 'Unsupported baseline management actor trigger table: %', TG_TABLE_NAME
            USING ERRCODE = '55000';
    END IF;

    SELECT organization_id INTO actor_organization_id
    FROM platform.account
    WHERE account_id = actor_id;

    IF actor_organization_id IS DISTINCT FROM NEW.organization_id THEN
        RAISE EXCEPTION 'Baseline management actor is outside the series organization'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
