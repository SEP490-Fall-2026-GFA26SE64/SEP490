-- User-confirmed early submission: terminal no-mastery outcome, not technical failure.
DO $$
DECLARE terminal_check text;
BEGIN
    SELECT conname INTO STRICT terminal_check FROM pg_constraint
    WHERE conrelid='platform.baseline_adaptive_attempt'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%completion_reason%';
    EXECUTE format('ALTER TABLE platform.baseline_adaptive_attempt DROP CONSTRAINT %I',terminal_check);
END;
$$;
ALTER TABLE platform.baseline_adaptive_attempt ADD CONSTRAINT baseline_adaptive_attempt_terminal_check
CHECK ((state='IN_PROGRESS' AND finished_at IS NULL AND completion_reason IS NULL)
    OR (finished_at IS NOT NULL AND completion_reason IS NOT NULL
      AND isfinite(finished_at) AND finished_at>=started_at AND (
        (state='SUBMITTED' AND completion_reason='MANUAL' AND finished_at<deadline_at)
        OR (state='AUTO_SUBMITTED' AND (
          (completion_reason='ADAPTIVE_STOP' AND finished_at<deadline_at)
          OR (completion_reason='DEADLINE' AND finished_at>=deadline_at)))
        OR (state='INVALIDATED' AND (
          completion_reason='TECHNICAL_FAILURE'
          OR (completion_reason='MANUAL' AND finished_at<deadline_at)
          OR (completion_reason='DEADLINE' AND finished_at>=deadline_at))))));
