-- Forward-only format2 extension. Historical V27 rows and content hashes are never rewritten.
ALTER TABLE platform.initial_pathway_revision ADD COLUMN format_version smallint NOT NULL DEFAULT 1
    CHECK (format_version IN (1,2));
ALTER TABLE platform.initial_pathway_revision ADD CONSTRAINT initial_revision_format_identity
    UNIQUE (request_id,revision,format_version);

CREATE TABLE platform.initial_pathway_teaching_v2 (
    request_id uuid NOT NULL,
    revision bigint NOT NULL,
    format_version smallint NOT NULL DEFAULT 2 CHECK (format_version=2),
    organization_id uuid NOT NULL,
    learner_id uuid NOT NULL,
    selection_id uuid NOT NULL,
    selection_revision bigint NOT NULL,
    module_id text NOT NULL,
    skill_id text NOT NULL CHECK (btrim(skill_id)<>''),
    teaching_focus text NOT NULL CHECK (teaching_focus IN ('PRIMARY','SUPPORTING','INCIDENTAL')),
    difficulty_level text NOT NULL CHECK (difficulty_level IN ('LOW','MEDIUM','HIGH')),
    coverage_role text NOT NULL CHECK (coverage_role IN ('COVERAGE','ANCILLARY')),
    preferred_difficulty text CHECK (preferred_difficulty IN ('LOW','MEDIUM','HIGH')),
    difficulty_fallback_rank smallint CHECK (difficulty_fallback_rank BETWEEN 0 AND 2),
    expert_attention boolean NOT NULL,
    attention_reason text,
    suitability_version text NOT NULL CHECK (btrim(suitability_version)<>''),
    reason text NOT NULL CHECK (btrim(reason)<>''),
    PRIMARY KEY (request_id,revision,module_id,skill_id),
    FOREIGN KEY (request_id,revision,module_id) REFERENCES platform.initial_pathway_module,
    FOREIGN KEY (request_id,revision,format_version) REFERENCES platform.initial_pathway_revision(request_id,revision,format_version),
    FOREIGN KEY (request_id,revision,organization_id,learner_id,selection_id,selection_revision)
        REFERENCES platform.initial_pathway_revision(request_id,revision,organization_id,learner_id,selection_id,selection_revision),
    CHECK ((expert_attention AND attention_reason IS NOT NULL AND btrim(attention_reason)<>'')
        OR (NOT expert_attention AND attention_reason IS NULL)),
    CHECK ((coverage_role='COVERAGE' AND teaching_focus<>'INCIDENTAL' AND preferred_difficulty IS NOT NULL
            AND difficulty_fallback_rank IS NOT NULL
            AND expert_attention=(teaching_focus='SUPPORTING' OR difficulty_fallback_rank>0))
        OR (coverage_role='ANCILLARY' AND difficulty_fallback_rank IS NULL AND NOT expert_attention))
);
CREATE UNIQUE INDEX initial_teaching_v2_one_coverage ON platform.initial_pathway_teaching_v2(request_id,revision,skill_id)
    WHERE coverage_role='COVERAGE';
CREATE TRIGGER initial_teaching_v2_immutable BEFORE UPDATE OR DELETE ON platform.initial_pathway_teaching_v2
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();
