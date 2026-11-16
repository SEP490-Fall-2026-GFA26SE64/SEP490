ALTER TABLE platform.organization_registration
    ADD COLUMN country varchar(2) CHECK (country ~ '^[A-Z]{2}$'),
    ADD COLUMN admin_phone varchar(16) CHECK (admin_phone ~ '^\+?[0-9]{7,15}$'),
    ADD COLUMN policies_accepted_at timestamptz;
