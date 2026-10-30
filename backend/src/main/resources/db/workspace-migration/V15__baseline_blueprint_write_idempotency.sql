ALTER TABLE platform.baseline_blueprint_version
    ADD COLUMN idempotency_key text,
    ADD COLUMN request_hash platform.content_hash;

-- V9 makes runtime history immutable. Temporarily suspend that trigger only for
-- this forward migration so any V9 rows can receive deterministic metadata.
ALTER TABLE platform.baseline_blueprint_version DISABLE TRIGGER immutable_history;

UPDATE platform.baseline_blueprint_version
SET idempotency_key = 'MIGRATED-V9:' || blueprint_id::text || ':' || version::text,
    request_hash = md5(blueprint_id::text || ':' || version::text)
        || md5('baseline-blueprint:' || blueprint_id::text || ':' || version::text)
WHERE idempotency_key IS NULL OR request_hash IS NULL;

ALTER TABLE platform.baseline_blueprint_version ENABLE TRIGGER immutable_history;

ALTER TABLE platform.baseline_blueprint_version
    ALTER COLUMN idempotency_key SET NOT NULL,
    ALTER COLUMN request_hash SET NOT NULL,
    ADD CONSTRAINT baseline_blueprint_idempotency_key_not_blank
        CHECK (btrim(idempotency_key) <> ''),
    ADD CONSTRAINT baseline_blueprint_actor_request_unique
        UNIQUE (created_by, idempotency_key);

COMMENT ON COLUMN platform.baseline_blueprint_version.idempotency_key IS
    'Client retry key scoped to the trusted L&D actor who creates this blueprint version.';
COMMENT ON COLUMN platform.baseline_blueprint_version.request_hash IS
    'SHA-256 of the normalized write command; rejects reuse of a key for different content.';
