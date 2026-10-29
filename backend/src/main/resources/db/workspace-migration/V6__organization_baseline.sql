CREATE TABLE platform.organization (
    organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE CHECK (code = upper(btrim(code)) AND code <> ''),
    name text NOT NULL CHECK (btrim(name) <> ''),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform.organizational_unit
    ADD COLUMN organization_id uuid REFERENCES platform.organization(organization_id),
    ADD CONSTRAINT organizational_unit_org_key UNIQUE (unit_id, organization_id);
CREATE INDEX organizational_unit_org_idx ON platform.organizational_unit(organization_id);

ALTER TABLE platform.account
    ADD COLUMN organization_id uuid REFERENCES platform.organization(organization_id),
    ADD CONSTRAINT account_unit_org_fk FOREIGN KEY (unit_id, organization_id)
        REFERENCES platform.organizational_unit(unit_id, organization_id);
CREATE INDEX account_org_idx ON platform.account(organization_id);

ALTER TABLE platform.application_role DROP CONSTRAINT application_role_role_code_check;
ALTER TABLE platform.application_role ADD CONSTRAINT application_role_role_code_check CHECK (role_code IN (
    'LEARNER', 'LD_MANAGER', 'ADMINISTRATOR', 'EMPLOYEE', 'DOMAIN_EXPERT',
    'ORGANIZATION_ADMINISTRATOR', 'PLATFORM_ADMINISTRATOR'
));
INSERT INTO platform.application_role(role_code)
VALUES ('EMPLOYEE'), ('DOMAIN_EXPERT'), ('ORGANIZATION_ADMINISTRATOR'), ('PLATFORM_ADMINISTRATOR');