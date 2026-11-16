-- Forward-only V4 definitions. No historical deadline or frozen paper backfill.
ALTER TABLE platform.initial_pathway_current
    ADD COLUMN timing_duration_months integer CHECK (timing_duration_months > 0),
    ADD COLUMN timing_basis jsonb,
    ADD COLUMN timing_started_at timestamptz,
    ADD COLUMN timing_deadline_at timestamptz,
    ADD COLUMN timing_completed_at timestamptz,
    ADD COLUMN timing_on_time boolean,
    ADD CONSTRAINT pathway_timing_consistent CHECK (
        (timing_started_at IS NULL AND timing_deadline_at IS NULL AND timing_duration_months IS NULL AND timing_basis IS NULL)
        OR (timing_started_at IS NOT NULL AND timing_deadline_at IS NOT NULL AND timing_deadline_at > timing_started_at
            AND timing_duration_months IS NOT NULL AND timing_basis IS NOT NULL)),
    ADD CONSTRAINT pathway_timing_completion_consistent CHECK (
        (timing_on_time IS NOT NULL)=(timing_completed_at IS NOT NULL AND timing_deadline_at IS NOT NULL)
        AND (timing_on_time IS NULL OR timing_on_time=(timing_completed_at<=timing_deadline_at)));

ALTER TABLE platform.rule_assessment_group
    ADD COLUMN mandatory_count integer CHECK (mandatory_count BETWEEN 0 AND total_count);

ALTER TABLE platform.learning_notification ALTER COLUMN module_id DROP NOT NULL;
ALTER TABLE platform.learning_notification ADD COLUMN deep_link text;
ALTER TABLE platform.learning_notification ADD COLUMN toast_observed_at timestamptz;
ALTER TABLE platform.learning_notification ADD CONSTRAINT learning_notification_target
    CHECK (module_id IS NOT NULL OR (deep_link IS NOT NULL AND deep_link LIKE '/employee/%'));
CREATE INDEX learning_notification_unobserved ON platform.learning_notification(organization_id,recipient_id,created_at)
    WHERE toast_observed_at IS NULL;

ALTER TABLE platform.initial_pathway_current DROP CONSTRAINT initial_pathway_current_review_status_check;
ALTER TABLE platform.initial_pathway_current ADD CONSTRAINT initial_pathway_current_review_status_check
    CHECK (review_status IN ('NONE','AWAITING_EXPERT_REVIEW','APPROVED','REJECTED','STALE','ARCHIVED'));
ALTER TABLE platform.rule_assessment_group ADD CONSTRAINT rule_group_mandatory_quota_consistent
    CHECK (mandatory_count IS NULL OR mandatory_required=(mandatory_count>0));
ALTER TABLE platform.initial_pathway_current ADD CONSTRAINT pathway_rejected_has_revision
    CHECK (review_status<>'REJECTED' OR current_revision IS NOT NULL);
ALTER TABLE platform.initial_pathway_current ADD CONSTRAINT pathway_completion_after_start
    CHECK (timing_completed_at IS NULL OR timing_started_at IS NULL OR timing_completed_at>=timing_started_at);

CREATE FUNCTION platform.guard_pathway_timing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.timing_started_at IS NOT NULL AND
       ROW(NEW.timing_started_at,NEW.timing_deadline_at,NEW.timing_duration_months,NEW.timing_basis)
       IS DISTINCT FROM ROW(OLD.timing_started_at,OLD.timing_deadline_at,OLD.timing_duration_months,OLD.timing_basis)
    THEN RAISE EXCEPTION 'First approval timing is immutable' USING ERRCODE='23514'; END IF;
    IF OLD.timing_completed_at IS NOT NULL AND
       ROW(NEW.timing_completed_at,NEW.timing_on_time) IS DISTINCT FROM ROW(OLD.timing_completed_at,OLD.timing_on_time)
    THEN RAISE EXCEPTION 'Pathway completion timing is immutable' USING ERRCODE='23514'; END IF;
    IF OLD.timing_started_at IS NULL AND NEW.timing_started_at IS NOT NULL AND EXISTS (
        SELECT 1 FROM platform.initial_pathway_approval a
        WHERE a.request_id=OLD.request_id AND a.organization_id=OLD.organization_id)
    THEN RAISE EXCEPTION 'Historical approval cannot acquire a deadline' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER pathway_timing_guard BEFORE UPDATE ON platform.initial_pathway_current
    FOR EACH ROW EXECUTE FUNCTION platform.guard_pathway_timing();
