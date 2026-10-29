ALTER TABLE platform.item_version
    ADD COLUMN micro_skill_id text,
    ADD COLUMN micro_skill_name_snapshot text,
    ADD COLUMN difficulty text;

ALTER TABLE platform.item_version
    ADD CONSTRAINT item_version_difficulty_check
        CHECK (difficulty IS NULL OR difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    ADD CONSTRAINT item_version_baseline_metadata_complete
        CHECK (
            (micro_skill_id IS NULL
                AND micro_skill_name_snapshot IS NULL
                AND difficulty IS NULL)
            OR
            (micro_skill_id IS NOT NULL
                AND btrim(micro_skill_id) <> ''
                AND micro_skill_name_snapshot IS NOT NULL
                AND btrim(micro_skill_name_snapshot) <> ''
                AND difficulty IS NOT NULL)
        );

COMMENT ON COLUMN platform.item_version.micro_skill_id IS
    'Stable Neo4j MicroSkill ID. NULL only for legacy item versions outside the new baseline path.';
COMMENT ON COLUMN platform.item_version.micro_skill_name_snapshot IS
    'MicroSkill display name captured with this item version. NULL only for legacy item versions.';
COMMENT ON COLUMN platform.item_version.difficulty IS
    'Baseline difficulty: EASY, MEDIUM, or HARD. NULL only for legacy item versions.';

CREATE OR REPLACE FUNCTION platform.guard_published_definition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.publication_state = 'PUBLISHED' THEN
        RAISE EXCEPTION 'Published assessment definitions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.publication_state = 'PUBLISHED' THEN
        IF TG_TABLE_NAME = 'item_version' THEN
            IF NEW.micro_skill_id IS NULL
                AND (SELECT coalesce(sum(evidence_weight), 0) FROM platform.item_skill_mapping
                    WHERE item_version_id = NEW.item_version_id) <> 1 THEN
                RAISE EXCEPTION 'Published legacy item evidence weights must sum to one' USING ERRCODE = '23514';
            END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM platform.assessment_item WHERE assessment_version_id = NEW.assessment_version_id AND required)
                OR EXISTS (SELECT 1 FROM platform.assessment_item entry JOIN platform.item_version item USING (item_version_id)
                    WHERE entry.assessment_version_id = NEW.assessment_version_id AND item.publication_state <> 'PUBLISHED') THEN
                RAISE EXCEPTION 'Assessment needs required items and published item versions' USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE INDEX item_version_baseline_selection_idx
    ON platform.item_version(micro_skill_id, difficulty)
    WHERE publication_state = 'PUBLISHED' AND micro_skill_id IS NOT NULL;
