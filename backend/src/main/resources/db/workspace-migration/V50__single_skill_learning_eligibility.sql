-- Immutable learning evidence, not assessment/mastery evidence. Existing lesson history is retained.
CREATE TABLE platform.learning_module_completion (
    organization_id text NOT NULL CHECK (btrim(organization_id)<>''),
    learner_id text NOT NULL CHECK (btrim(learner_id)<>''),
    module_id text NOT NULL,
    revision integer NOT NULL CHECK(revision>0),
    skill_id text NOT NULL CHECK(btrim(skill_id)<>''),
    content_version text NOT NULL CHECK(btrim(content_version)<>''),
    completed_at timestamptz NOT NULL,
    PRIMARY KEY(organization_id,learner_id,module_id,revision),
    FOREIGN KEY(organization_id,module_id) REFERENCES platform.module_authoring(organization_id,module_id)
);
CREATE INDEX learning_completion_skill ON platform.learning_module_completion(organization_id,learner_id,skill_id,completed_at);
CREATE TABLE platform.learning_self_study (
    organization_id text NOT NULL CHECK(btrim(organization_id)<>''),
    learner_id text NOT NULL CHECK(btrim(learner_id)<>''),
    module_id text NOT NULL,
    revision integer NOT NULL CHECK(revision>0),
    skill_id text NOT NULL CHECK(btrim(skill_id)<>''),
    admitted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(organization_id,learner_id,module_id,revision),
    FOREIGN KEY(organization_id,module_id) REFERENCES platform.module_authoring(organization_id,module_id)
);
-- Backfill only original single-Skill snapshots with every original lesson genuinely completed.
-- Multi-Skill historical revisions are deliberately left for reconciliation, not reinterpreted.
WITH snapshots AS (
    SELECT m.organization_id,m.module_id,(r->>'number')::integer AS revision,r->'payload' AS payload
    FROM platform.module_authoring m CROSS JOIN LATERAL jsonb_array_elements(m.document->'revisions') r
    WHERE r->>'state' IN ('RELEASED','ARCHIVE_REQUESTED','ARCHIVE_PENDING','ARCHIVED')
      AND r->'payload'->'metadata'->>'reviewStatus'='APPROVED'
      AND jsonb_array_length(r->'payload'->'teachings')=1
      AND jsonb_typeof(r->'payload'->'content'->'lessons')='array'
      AND jsonb_array_length(r->'payload'->'content'->'lessons')>0
), eligible AS (
    SELECT s.*,p.learner_id,max(p.completed_at) AS completed_at,
        count(DISTINCT l->>'id') AS lesson_count,
        count(DISTINCT p.lesson_id) FILTER (WHERE p.completed_at IS NOT NULL) AS completed_count
    FROM snapshots s CROSS JOIN LATERAL jsonb_array_elements(s.payload->'content'->'lessons') l
    JOIN platform.learning_lesson_progress p ON p.organization_id=s.organization_id AND p.module_id=s.module_id
        AND p.revision=s.revision AND p.lesson_id=l->>'id'
    GROUP BY s.organization_id,s.module_id,s.revision,s.payload,p.learner_id
)
INSERT INTO platform.learning_module_completion(organization_id,learner_id,module_id,revision,skill_id,content_version,completed_at)
SELECT organization_id,learner_id,module_id,revision,payload->'teachings'->0->>'skillId',payload->>'contentVersion',completed_at
FROM eligible WHERE completed_count=jsonb_array_length(payload->'content'->'lessons')
    AND lesson_count=jsonb_array_length(payload->'content'->'lessons')
    AND completed_at IS NOT NULL
    AND nullif(btrim(payload->'teachings'->0->>'skillId'),'') IS NOT NULL
    AND nullif(btrim(payload->>'contentVersion'),'') IS NOT NULL
ON CONFLICT DO NOTHING;
CREATE FUNCTION platform.protect_learning_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Learning provenance is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER learning_completion_immutable BEFORE UPDATE OR DELETE ON platform.learning_module_completion
    FOR EACH ROW EXECUTE FUNCTION platform.protect_learning_provenance();
CREATE TRIGGER learning_self_study_immutable BEFORE UPDATE OR DELETE ON platform.learning_self_study
    FOR EACH ROW EXECUTE FUNCTION platform.protect_learning_provenance();
