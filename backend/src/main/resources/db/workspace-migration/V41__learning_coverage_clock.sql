-- Position-only heartbeats must not invalidate buffered, actually watched segments.
ALTER TABLE platform.learning_lesson_progress ADD COLUMN coverage_updated_at timestamptz;
UPDATE platform.learning_lesson_progress SET coverage_updated_at=updated_at;
ALTER TABLE platform.learning_lesson_progress ALTER COLUMN coverage_updated_at SET DEFAULT now();
ALTER TABLE platform.learning_lesson_progress ALTER COLUMN coverage_updated_at SET NOT NULL;
