-- Explicit legacy-Draft conversion adds an immutable command response, not a released version.
-- No historical payload, learner state or previously applied migration is rewritten.
ALTER TABLE platform.baseline_blueprint_command
    DROP CONSTRAINT baseline_blueprint_command_operation_check,
    ADD CONSTRAINT baseline_blueprint_command_operation_check
        CHECK (operation IN ('SAVE', 'CONVERT', 'FINALIZE', 'DISABLE'));

COMMENT ON TABLE platform.baseline_blueprint_command IS
    'Immutable actor/tenant/key responses; CONVERT retains original Draft snapshot and new common Draft. Exact replay is authorized before lookup.';
