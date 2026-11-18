-- Read historical scope from the frozen MAIN group/definition; never rewrite old attempts or guess a version.
CREATE FUNCTION platform.rule_skill_snapshot_scope(doc jsonb, skill text, level text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE definitions jsonb; definition jsonb; matched jsonb; matches integer := 0; version text;
BEGIN
    IF skill IS NULL OR btrim(skill)='' OR length(skill)>200 OR level NOT IN ('FOUNDATION','INTERMEDIATE','ADVANCED') OR level IS NULL THEN RETURN NULL; END IF;
    definitions := doc #> '{context,requirements}';
    IF jsonb_typeof(definitions) IS DISTINCT FROM 'array' THEN RETURN NULL; END IF;
    FOR definition IN SELECT value FROM jsonb_array_elements(definitions) LOOP
        IF definition #>> '{requirement,skillId}'=skill AND definition #>> '{requirement,knowledgeLevel}'=level THEN
            matches := matches+1; matched := definition;
        END IF;
    END LOOP;
    IF matches<>1 OR jsonb_typeof(matched->'skillVersion') IS DISTINCT FROM 'string'
        OR jsonb_typeof(matched #> '{requirement,skillId}') IS DISTINCT FROM 'string'
        OR jsonb_typeof(matched #> '{requirement,knowledgeLevel}') IS DISTINCT FROM 'string' THEN RETURN NULL; END IF;
    version := matched->>'skillVersion';
    IF btrim(version)='' OR length(version)>200 THEN RETURN NULL; END IF;
    RETURN jsonb_build_array(skill,level,version);
END; $$;

CREATE FUNCTION platform.rule_skill_attempt_scope(attempt uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN count(g.group_id)=1 THEN platform.rule_skill_snapshot_scope(a.context_snapshot,min(g.skill_id),min(g.knowledge_level)) END
    FROM platform.rule_assessment_attempt a
    LEFT JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.organization_id=a.organization_id
        AND g.learner_id=a.learner_id AND g.group_role='MAIN'
    WHERE a.id=attempt AND a.purpose='SKILL_ASSESSMENT'
    GROUP BY a.id,a.context_snapshot
$$;

-- The old composite FK forbids linking a new shared-scope attempt to its real module-scoped predecessor.
-- Retain owner referential integrity; the trigger below preserves Baseline context equality and validates Skill scope.
DO $$ DECLARE constraint_name text; BEGIN
    FOR constraint_name IN
        SELECT c.conname FROM pg_constraint c
        WHERE c.conrelid='platform.rule_assessment_attempt'::regclass AND c.contype='f'
          AND c.confrelid='platform.rule_assessment_attempt'::regclass
          AND (SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='previous_attempt_id')=ANY(c.conkey)
    LOOP EXECUTE format('ALTER TABLE platform.rule_assessment_attempt DROP CONSTRAINT %I',constraint_name); END LOOP;
END; $$;
ALTER TABLE platform.rule_assessment_attempt ADD CONSTRAINT rule_attempt_previous_owner_fk
    FOREIGN KEY(organization_id,learner_id,previous_attempt_id)
    REFERENCES platform.rule_assessment_attempt(organization_id,learner_id,id);

CREATE FUNCTION platform.guard_shared_skill_attempt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent platform.rule_assessment_attempt%ROWTYPE; scope jsonb; parent_scope jsonb; main_skill text; main_level text;
BEGIN
    IF NEW.purpose='SKILL_ASSESSMENT' THEN
        -- Service snapshots always place MAIN first; persisted history is independently verified against its MAIN group.
        main_skill := NEW.context_snapshot #>> '{context,requirements,0,requirement,skillId}';
        main_level := NEW.context_snapshot #>> '{context,requirements,0,requirement,knowledgeLevel}';
        scope := platform.rule_skill_snapshot_scope(NEW.context_snapshot,main_skill,main_level);
        IF scope IS NULL THEN RAISE EXCEPTION 'Unresolved Skill assessment scope' USING ERRCODE='23514'; END IF;
        PERFORM pg_advisory_xact_lock(hashtextextended('AB-ATTEMPT-ACTOR-V1'||chr(10)||NEW.organization_id||chr(10)||NEW.learner_id,0));
        IF EXISTS(SELECT 1 FROM platform.rule_assessment_attempt a WHERE a.organization_id=NEW.organization_id AND a.learner_id=NEW.learner_id
            AND a.purpose='SKILL_ASSESSMENT' AND platform.rule_skill_attempt_scope(a.id) IS NULL
            AND (NOT EXISTS(SELECT 1 FROM platform.rule_assessment_group g WHERE g.attempt_id=a.id AND g.group_role='MAIN')
                OR EXISTS(SELECT 1 FROM platform.rule_assessment_group g WHERE g.attempt_id=a.id AND g.group_role='MAIN' AND g.skill_id=main_skill AND g.knowledge_level=main_level)))
        THEN RAISE EXCEPTION 'Historical Skill scope requires reconciliation' USING ERRCODE='23514'; END IF;
        IF EXISTS(SELECT 1 FROM platform.rule_assessment_attempt a WHERE a.organization_id=NEW.organization_id AND a.learner_id=NEW.learner_id
            AND a.purpose='SKILL_ASSESSMENT' AND a.state='IN_PROGRESS' AND platform.rule_skill_attempt_scope(a.id)=scope)
        THEN RAISE EXCEPTION 'Skill assessment already in progress' USING ERRCODE='23505'; END IF;
    END IF;
    IF NEW.previous_attempt_id IS NOT NULL THEN
        SELECT * INTO parent FROM platform.rule_assessment_attempt WHERE id=NEW.previous_attempt_id;
        IF NOT FOUND OR parent.organization_id<>NEW.organization_id OR parent.learner_id<>NEW.learner_id OR parent.purpose<>NEW.purpose THEN
            RAISE EXCEPTION 'Invalid owned assessment predecessor' USING ERRCODE='23514';
        END IF;
        IF NEW.purpose='BASELINE' THEN
            IF parent.context_key<>NEW.context_key THEN RAISE EXCEPTION 'Baseline predecessor context changed' USING ERRCODE='23514'; END IF;
        ELSE
            parent_scope := platform.rule_skill_attempt_scope(parent.id);
            IF parent_scope IS NULL OR parent_scope<>scope OR parent.state<>'FINALIZED' THEN
                RAISE EXCEPTION 'Skill predecessor scope changed' USING ERRCODE='23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER rule_attempt_shared_skill_insert BEFORE INSERT ON platform.rule_assessment_attempt
    FOR EACH ROW EXECUTE FUNCTION platform.guard_shared_skill_attempt_insert();
