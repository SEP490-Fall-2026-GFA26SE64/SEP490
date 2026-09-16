CREATE FUNCTION platform.guard_published_definition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.publication_state = 'PUBLISHED' THEN
        RAISE EXCEPTION 'Published assessment definitions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.publication_state = 'PUBLISHED' THEN
        IF TG_TABLE_NAME = 'item_version' THEN
            IF (SELECT coalesce(sum(evidence_weight), 0) FROM platform.item_skill_mapping WHERE item_version_id = NEW.item_version_id) <> 1 THEN
                RAISE EXCEPTION 'Published item evidence weights must sum to one' USING ERRCODE = '23514';
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
CREATE TRIGGER item_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.item_version
    FOR EACH ROW EXECUTE FUNCTION platform.guard_published_definition();
CREATE TRIGGER assessment_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON platform.assessment_version
    FOR EACH ROW EXECUTE FUNCTION platform.guard_published_definition();

CREATE FUNCTION platform.guard_published_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_parent uuid; new_parent uuid; parent_state text;
BEGIN
    IF TG_TABLE_NAME = 'assessment_item' THEN
        IF TG_OP <> 'INSERT' THEN old_parent := OLD.assessment_version_id; END IF;
        IF TG_OP <> 'DELETE' THEN new_parent := NEW.assessment_version_id; END IF;
        FOR parent_state IN SELECT publication_state FROM platform.assessment_version
            WHERE assessment_version_id IN (old_parent, new_parent) ORDER BY assessment_version_id FOR UPDATE
        LOOP
            IF parent_state = 'PUBLISHED' THEN
                RAISE EXCEPTION 'Published assessment item set is immutable' USING ERRCODE = '23514';
            END IF;
        END LOOP;
    ELSE
        IF TG_OP <> 'INSERT' THEN old_parent := OLD.item_version_id; END IF;
        IF TG_OP <> 'DELETE' THEN new_parent := NEW.item_version_id; END IF;
        FOR parent_state IN SELECT publication_state FROM platform.item_version
            WHERE item_version_id IN (old_parent, new_parent) ORDER BY item_version_id FOR UPDATE
        LOOP
            IF parent_state = 'PUBLISHED' THEN
                RAISE EXCEPTION 'Published item mapping set is immutable' USING ERRCODE = '23514';
            END IF;
        END LOOP;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER assessment_items_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.assessment_item
    FOR EACH ROW EXECUTE FUNCTION platform.guard_published_children();
CREATE TRIGGER item_mappings_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.item_skill_mapping
    FOR EACH ROW EXECUTE FUNCTION platform.guard_published_children();

CREATE FUNCTION platform.validate_activity_requirements() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE activity_record platform.learning_activity%ROWTYPE;
BEGIN
    SELECT * INTO activity_record FROM platform.learning_activity WHERE activity_id = NEW.activity_id;
    IF NOT EXISTS (SELECT 1 FROM platform.activity_requirement WHERE activity_id = NEW.activity_id AND required)
        OR EXISTS (
            SELECT 1 FROM platform.module_assessment_binding binding
            WHERE binding.module_ref_id = activity_record.module_ref_id
            AND NOT EXISTS (SELECT 1 FROM platform.activity_requirement requirement
                WHERE requirement.activity_id = activity_record.activity_id
                AND requirement.assessment_version_id = binding.assessment_version_id)
        ) THEN
        RAISE EXCEPTION 'Activity must pin the complete module assessment binding with at least one required assessment' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER activity_has_requirements AFTER INSERT ON platform.learning_activity
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.validate_activity_requirements();

ALTER TABLE platform.profile_revision ADD UNIQUE (profile_revision_id, model_version_id, policy_version_id);
ALTER TABLE platform.recommendation_run ADD FOREIGN KEY (profile_revision_id, model_version_id, policy_version_id)
    REFERENCES platform.profile_revision(profile_revision_id, model_version_id, policy_version_id);

CREATE FUNCTION platform.guard_pathway_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Pathway revision history cannot be deleted' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['status', 'validation_status', 'published_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'validation_status', 'published_at']) THEN
        RAISE EXCEPTION 'Pathway edits require a new revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER pathway_content_frozen BEFORE UPDATE OR DELETE ON platform.pathway_revision
    FOR EACH ROW EXECUTE FUNCTION platform.guard_pathway_content();
CREATE FUNCTION platform.guard_pathway_step_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_state text;
BEGIN
    SELECT status INTO revision_state FROM platform.pathway_revision
        WHERE pathway_revision_id = NEW.pathway_revision_id FOR UPDATE;
    IF revision_state NOT IN ('GENERATED', 'IN_REVIEW') OR EXISTS (
        SELECT 1 FROM platform.pathway_approval WHERE pathway_revision_id = NEW.pathway_revision_id
    ) THEN
        RAISE EXCEPTION 'Cannot add steps to an approved pathway revision' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER pathway_steps_frozen BEFORE INSERT ON platform.pathway_step
    FOR EACH ROW EXECUTE FUNCTION platform.guard_pathway_step_insert();