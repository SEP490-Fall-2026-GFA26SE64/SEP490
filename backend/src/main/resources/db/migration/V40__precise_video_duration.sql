-- Fractional media durations are required for an exact 90% coverage threshold.
ALTER TABLE platform.learning_asset ALTER COLUMN duration_seconds TYPE double precision;
ALTER TABLE platform.learning_video_verification ALTER COLUMN duration_seconds TYPE double precision;
ALTER TABLE platform.learning_asset ADD CONSTRAINT learning_asset_duration_finite CHECK(duration_seconds IS NULL OR duration_seconds BETWEEN 0.001 AND 604800);
ALTER TABLE platform.learning_video_verification ADD CONSTRAINT learning_video_duration_finite CHECK(duration_seconds BETWEEN 0.001 AND 604800);
