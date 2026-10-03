-- Local development fixtures. No authentication password is provisioned.
-- Matches application-local.yml and the catalog workbook's organizationId.
BEGIN;
SELECT pg_advisory_xact_lock(490, 1001);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM platform.organization
        WHERE (organization_id = '00000000-0000-0000-0000-000000000001' OR code = 'ALG_DEMO')
          AND NOT (organization_id = '00000000-0000-0000-0000-000000000001'
                   AND code = 'ALG_DEMO' AND status = 'ACTIVE')
    ) THEN
        RAISE EXCEPTION 'Demo organization identity conflict; existing organization was not changed';
    END IF;
END $$;

INSERT INTO platform.organization(organization_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'ALG_DEMO', 'AdaptLearnGraph Demo Organization')
ON CONFLICT (organization_id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM platform.organizational_unit
        WHERE unit_id = '00000000-0000-0000-0000-000000000010'
          AND (organization_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid
               OR name <> 'Demo Engineering' OR parent_unit_id IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Demo organizational unit conflict';
    END IF;
END $$;

INSERT INTO platform.organizational_unit(unit_id, name, organization_id)
VALUES ('00000000-0000-0000-0000-000000000010', 'Demo Engineering', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (unit_id) DO NOTHING;

CREATE TEMP TABLE demo_accounts(account_id uuid, identifier text, role_code text) ON COMMIT DROP;
INSERT INTO demo_accounts VALUES
('00000000-0000-0000-0000-000000000002', 'org-admin@alg-demo.example', 'ORGANIZATION_ADMINISTRATOR'),
('00000000-0000-0000-0000-000000000003', 'expert@alg-demo.example', 'DOMAIN_EXPERT'),
('00000000-0000-0000-0000-000000000001', 'employee@alg-demo.example', 'EMPLOYEE');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM demo_accounts d JOIN platform.account a
          ON a.account_id = d.account_id OR a.normalized_identifier = d.identifier
        WHERE a.account_id <> d.account_id OR a.identifier <> d.identifier
           OR a.normalized_identifier <> d.identifier
           OR a.organization_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid
           OR a.unit_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000010'::uuid
           OR NOT a.active
    ) THEN
        RAISE EXCEPTION 'Demo account identity/tenant/status conflict; no accounts changed';
    END IF;
    IF EXISTS (
        SELECT 1 FROM demo_accounts d JOIN platform.account_role r USING (account_id)
        WHERE r.role_code <> d.role_code
    ) THEN
        RAISE EXCEPTION 'Demo account already has another role; refusing implicit privilege changes';
    END IF;
END $$;

INSERT INTO platform.account(account_id, unit_id, identifier, normalized_identifier, password_hash, organization_id)
SELECT account_id, '00000000-0000-0000-0000-000000000010', identifier, identifier,
       '!LOCAL_FIXTURE_NO_LOGIN!', '00000000-0000-0000-0000-000000000001'
FROM demo_accounts ON CONFLICT (account_id) DO NOTHING;

INSERT INTO platform.account_role(account_id, role_code)
SELECT account_id, role_code FROM demo_accounts ON CONFLICT DO NOTHING;

INSERT INTO platform.learner_state(learner_id)
VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;

SELECT json_build_object('organizationId', a.organization_id, 'accountId', a.account_id,
                         'identifier', a.identifier, 'role', r.role_code)
FROM platform.account a JOIN platform.account_role r USING (account_id)
JOIN demo_accounts d USING (account_id)
ORDER BY a.identifier;
COMMIT;
