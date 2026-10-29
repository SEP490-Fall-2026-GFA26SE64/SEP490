DO $$
BEGIN
    IF EXISTS (
        SELECT m.membership_id FROM platform.organization_membership m
        LEFT JOIN platform.organization_membership_role r USING(membership_id)
        GROUP BY m.membership_id HAVING count(r.role_code) <> 1
    ) OR EXISTS (
        SELECT 1 FROM platform.workspace_activation WHERE consumed_at IS NULL AND cardinality(roles) <> 1
    ) OR EXISTS (
        SELECT 1 FROM platform.platform_administrator p JOIN platform.account a USING(account_id)
        WHERE a.organization_id IS NOT NULL
          OR EXISTS(SELECT 1 FROM platform.organization_membership m WHERE m.account_id=p.account_id)
    ) THEN
        RAISE EXCEPTION 'Resolve ambiguous account roles and pending invitations before applying V12; no role is selected automatically';
    END IF;
END $$;

ALTER TABLE platform.organization_membership_role
    ADD CONSTRAINT membership_single_role UNIQUE(membership_id);
ALTER TABLE platform.workspace_activation
    ADD CONSTRAINT pending_activation_single_role CHECK(consumed_at IS NOT NULL OR cardinality(roles)=1);

CREATE FUNCTION platform.guard_role_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
    target := NEW.account_id;
    PERFORM 1 FROM platform.account WHERE account_id=target FOR UPDATE;
    IF TG_TABLE_NAME='platform_administrator' THEN
        IF EXISTS(SELECT 1 FROM platform.account WHERE account_id=target AND organization_id IS NOT NULL)
           OR EXISTS(SELECT 1 FROM platform.organization_membership WHERE account_id=target) THEN
            RAISE EXCEPTION 'A platform administrator cannot have organization membership' USING ERRCODE='23514';
        END IF;
    ELSIF EXISTS(SELECT 1 FROM platform.platform_administrator WHERE account_id=target) THEN
        IF TG_TABLE_NAME='organization_membership' OR NEW.organization_id IS NOT NULL THEN
            RAISE EXCEPTION 'An account can have only one role boundary' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER platform_role_boundary BEFORE INSERT OR UPDATE ON platform.platform_administrator
    FOR EACH ROW EXECUTE FUNCTION platform.guard_role_boundary();
CREATE TRIGGER membership_role_boundary BEFORE INSERT OR UPDATE ON platform.organization_membership
    FOR EACH ROW EXECUTE FUNCTION platform.guard_role_boundary();
CREATE TRIGGER account_role_boundary BEFORE UPDATE OF organization_id ON platform.account
    FOR EACH ROW EXECUTE FUNCTION platform.guard_role_boundary();

CREATE FUNCTION platform.require_membership_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
    target := COALESCE(NEW.membership_id, OLD.membership_id);
    IF EXISTS(SELECT 1 FROM platform.organization_membership WHERE membership_id=target)
       AND (SELECT count(*) FROM platform.organization_membership_role WHERE membership_id=target)<>1 THEN
        RAISE EXCEPTION 'Membership must have exactly one role' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER membership_requires_role AFTER INSERT OR UPDATE ON platform.organization_membership
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.require_membership_role();
CREATE CONSTRAINT TRIGGER membership_role_required AFTER INSERT OR UPDATE OR DELETE ON platform.organization_membership_role
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.require_membership_role();
