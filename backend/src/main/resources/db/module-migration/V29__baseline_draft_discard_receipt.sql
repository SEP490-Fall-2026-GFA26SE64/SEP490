-- Forward-only expansion. Preserve closed Drafts and immutable command receipts.
ALTER TABLE platform.baseline_blueprint_command
    DROP CONSTRAINT baseline_blueprint_command_operation_check,
    ADD CONSTRAINT baseline_blueprint_command_operation_check
        CHECK (operation IN ('SAVE', 'CONVERT', 'FINALIZE', 'DISABLE', 'DISCARD'));
