ALTER TABLE platform.assessment_version
    ADD COLUMN reviewed_by uuid REFERENCES platform.account,
    ADD COLUMN reviewed_at timestamptz,
    ADD COLUMN reviewed_content_hash platform.content_hash,
    ADD CONSTRAINT assessment_version_review_metadata_complete
        CHECK (
            (reviewed_by IS NULL AND reviewed_at IS NULL AND reviewed_content_hash IS NULL)
            OR
            (reviewed_by IS NOT NULL
                AND reviewed_at IS NOT NULL
                AND reviewed_content_hash IS NOT NULL
                AND reviewed_content_hash = content_hash)
        );

CREATE OR REPLACE FUNCTION platform.guard_published_definition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.publication_state = 'PUBLISHED' THEN
        RAISE EXCEPTION 'Published assessment definitions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

    IF TG_TABLE_NAME = 'assessment_version' THEN
        IF TG_OP = 'UPDATE'
            AND OLD.reviewed_content_hash IS NOT NULL
            AND (to_jsonb(NEW) - 'publication_state')
                IS DISTINCT FROM (to_jsonb(OLD) - 'publication_state') THEN
            RAISE EXCEPTION 'Reviewed assessment content and review evidence are immutable'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.blueprint_id IS NOT NULL
            AND NEW.publication_state = 'PUBLISHED'
            AND NEW.reviewed_content_hash IS DISTINCT FROM NEW.content_hash THEN
            RAISE EXCEPTION 'Generated baseline assessment must publish the reviewed content hash'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.publication_state = 'PUBLISHED' THEN
        IF TG_TABLE_NAME = 'item_version' THEN
            IF NEW.micro_skill_id IS NULL
                AND (SELECT coalesce(sum(evidence_weight), 0)
                    FROM platform.item_skill_mapping
                    WHERE item_version_id = NEW.item_version_id) <> 1 THEN
                RAISE EXCEPTION 'Published legacy item evidence weights must sum to one'
                    USING ERRCODE = '23514';
            END IF;
        ELSE
            IF NOT EXISTS (
                    SELECT 1 FROM platform.assessment_item
                    WHERE assessment_version_id = NEW.assessment_version_id AND required)
                OR EXISTS (
                    SELECT 1
                    FROM platform.assessment_item entry
                    JOIN platform.item_version item USING (item_version_id)
                    WHERE entry.assessment_version_id = NEW.assessment_version_id
                      AND item.publication_state <> 'PUBLISHED') THEN
                RAISE EXCEPTION 'Assessment needs required items and published item versions'
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION platform.guard_reviewed_assessment_items()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_parent uuid;
    new_parent uuid;
    reviewed_hash platform.content_hash;
BEGIN
    IF TG_OP <> 'INSERT' THEN old_parent := OLD.assessment_version_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_parent := NEW.assessment_version_id; END IF;

    FOR reviewed_hash IN
        SELECT reviewed_content_hash
        FROM platform.assessment_version
        WHERE assessment_version_id IN (old_parent, new_parent)
        ORDER BY assessment_version_id
        FOR UPDATE
    LOOP
        IF reviewed_hash IS NOT NULL THEN
            RAISE EXCEPTION 'Reviewed assessment item set is immutable' USING ERRCODE = '23514';
        END IF;
    END LOOP;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER reviewed_assessment_items_frozen
    BEFORE INSERT OR UPDATE OR DELETE ON platform.assessment_item
    FOR EACH ROW EXECUTE FUNCTION platform.guard_reviewed_assessment_items();

COMMENT ON COLUMN platform.assessment_version.reviewed_content_hash IS
    'Exact manifest content hash approved by L&D before publication.';
