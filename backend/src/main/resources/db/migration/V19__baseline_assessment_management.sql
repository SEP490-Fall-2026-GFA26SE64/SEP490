-- One tenant-scoped release line coordinates every mutable baseline-management write.
ALTER TABLE platform.baseline_blueprint
    ADD COLUMN organization_id uuid REFERENCES platform.organization(organization_id);

-- Historical data must identify one organization without guessing or merging tenants.
DO $$
BEGIN
    IF EXISTS (
        SELECT identity.blueprint_id
        FROM platform.baseline_blueprint identity
        JOIN platform.account creator ON creator.account_id = identity.created_by
        LEFT JOIN platform.baseline_blueprint_version version
          ON version.blueprint_id = identity.blueprint_id
        LEFT JOIN platform.account version_creator ON version_creator.account_id = version.created_by
        WHERE identity.occupation_id IS NOT NULL
        GROUP BY identity.blueprint_id, creator.organization_id
        HAVING creator.organization_id IS NULL
            OR bool_or(version_creator.organization_id IS DISTINCT FROM creator.organization_id)
    ) THEN
        RAISE EXCEPTION 'Cannot backfill baseline blueprint organization without one consistent tenant'
            USING ERRCODE = '23514';
    END IF;
END;
$$;

ALTER TABLE platform.baseline_blueprint DISABLE TRIGGER immutable_history;
UPDATE platform.baseline_blueprint identity
SET organization_id = creator.organization_id
FROM platform.account creator
WHERE creator.account_id = identity.created_by
  AND identity.occupation_id IS NOT NULL;
ALTER TABLE platform.baseline_blueprint ENABLE TRIGGER immutable_history;

ALTER TABLE platform.baseline_blueprint
    ADD CONSTRAINT baseline_blueprint_organization_required
        CHECK (occupation_id IS NULL OR organization_id IS NOT NULL),
    ADD CONSTRAINT baseline_blueprint_org_identity_key
        UNIQUE (blueprint_id, organization_id, occupation_id);

DROP INDEX platform.baseline_blueprint_occupation_unique;
CREATE UNIQUE INDEX baseline_blueprint_organization_occupation_unique
    ON platform.baseline_blueprint (organization_id, occupation_id)
    WHERE organization_id IS NOT NULL AND occupation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION platform.validate_baseline_blueprint_occupation_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    identity_record record;
    creator_organization_id uuid;
BEGIN
    SELECT identity.occupation_id, identity.organization_id
    INTO identity_record
    FROM platform.baseline_blueprint identity
    WHERE identity.blueprint_id = NEW.blueprint_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Baseline blueprint identity is missing'
            USING ERRCODE = '23503';
    END IF;

    IF identity_record.occupation_id IS DISTINCT FROM NEW.occupation_id THEN
        RAISE EXCEPTION 'Blueprint version occupation does not match its logical identity'
            USING ERRCODE = '23514';
    END IF;

    SELECT organization_id INTO creator_organization_id
    FROM platform.account
    WHERE account_id = NEW.created_by;

    IF identity_record.organization_id IS DISTINCT FROM creator_organization_id THEN
        RAISE EXCEPTION 'Blueprint version creator is outside the blueprint organization'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

ALTER TABLE platform.assessment_version
    ADD COLUMN draft_revision bigint NOT NULL DEFAULT 1 CHECK (draft_revision > 0),
    ADD COLUMN baseline_candidate_state text
        CHECK (baseline_candidate_state IN ('OPEN', 'CLOSED'));

-- Existing unpublished generated baselines are candidates. Ambiguity is rejected below.
ALTER TABLE platform.assessment_version DISABLE TRIGGER assessment_publication_guard;
UPDATE platform.assessment_version
SET baseline_candidate_state = CASE
        WHEN publication_state = 'DRAFT' THEN 'OPEN'
        ELSE 'CLOSED'
    END
WHERE purpose = 'BASELINE' AND blueprint_id IS NOT NULL;
ALTER TABLE platform.assessment_version ENABLE TRIGGER assessment_publication_guard;

ALTER TABLE platform.assessment_version
    ADD CONSTRAINT assessment_version_baseline_candidate_complete CHECK (
        (baseline_candidate_state IS NOT NULL)
            = (purpose = 'BASELINE' AND blueprint_id IS NOT NULL)
    );

-- Publishing may close the lifecycle candidate marker, but never changes reviewed content.
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
            AND (to_jsonb(NEW) - 'publication_state' - 'baseline_candidate_state')
                IS DISTINCT FROM
                (to_jsonb(OLD) - 'publication_state' - 'baseline_candidate_state') THEN
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

CREATE FUNCTION platform.validate_baseline_assessment_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    blueprint_organization_id uuid;
    creator_organization_id uuid;
    reviewer_organization_id uuid;
BEGIN
    IF NEW.purpose <> 'BASELINE' OR NEW.blueprint_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT organization_id INTO blueprint_organization_id
    FROM platform.baseline_blueprint
    WHERE blueprint_id = NEW.blueprint_id;
    SELECT organization_id INTO creator_organization_id
    FROM platform.account
    WHERE account_id = NEW.created_by;
    IF blueprint_organization_id IS NULL
        OR blueprint_organization_id IS DISTINCT FROM creator_organization_id THEN
        RAISE EXCEPTION 'Baseline assessment creator is outside the blueprint organization'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.reviewed_by IS NOT NULL THEN
        SELECT organization_id INTO reviewer_organization_id
        FROM platform.account
        WHERE account_id = NEW.reviewed_by;
        IF blueprint_organization_id IS DISTINCT FROM reviewer_organization_id THEN
            RAISE EXCEPTION 'Baseline assessment reviewer is outside the blueprint organization'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER baseline_assessment_tenant_scope
    BEFORE INSERT OR UPDATE ON platform.assessment_version
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_assessment_tenant();

DO $$
BEGIN
    IF EXISTS (
        SELECT blueprint_id
        FROM platform.assessment_version
        WHERE baseline_candidate_state = 'OPEN'
        GROUP BY blueprint_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot backfill baseline lifecycle: a blueprint has multiple open candidates'
            USING ERRCODE = '23505';
    END IF;
END;
$$;

CREATE UNIQUE INDEX assessment_version_one_open_baseline_candidate
    ON platform.assessment_version (blueprint_id)
    WHERE baseline_candidate_state = 'OPEN';

CREATE TABLE platform.baseline_assessment_series (
    organization_id uuid NOT NULL REFERENCES platform.organization(organization_id),
    occupation_id text NOT NULL CHECK (btrim(occupation_id) <> ''),
    blueprint_id uuid NOT NULL,
    series_revision bigint NOT NULL DEFAULT 1 CHECK (series_revision > 0),
    working_revision_id uuid,
    pending_blueprint_version integer CHECK (pending_blueprint_version > 0),
    open_assessment_version_id uuid REFERENCES platform.assessment_version,
    active_assessment_version_id uuid REFERENCES platform.assessment_version,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, occupation_id),
    UNIQUE (blueprint_id),
    FOREIGN KEY (blueprint_id, organization_id, occupation_id)
        REFERENCES platform.baseline_blueprint(blueprint_id, organization_id, occupation_id),
    FOREIGN KEY (blueprint_id, pending_blueprint_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    CHECK (working_revision_id IS NULL OR pending_blueprint_version IS NULL),
    CHECK (open_assessment_version_id IS NULL
        OR open_assessment_version_id IS DISTINCT FROM active_assessment_version_id)
);

CREATE UNIQUE INDEX baseline_assessment_series_open_candidate_unique
    ON platform.baseline_assessment_series (open_assessment_version_id)
    WHERE open_assessment_version_id IS NOT NULL;
CREATE UNIQUE INDEX baseline_assessment_series_active_release_unique
    ON platform.baseline_assessment_series (active_assessment_version_id)
    WHERE active_assessment_version_id IS NOT NULL;

CREATE TABLE platform.baseline_blueprint_working_revision (
    working_revision_id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    blueprint_id uuid NOT NULL,
    base_version integer CHECK (base_version > 0),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    occupation_name_snapshot text NOT NULL CHECK (btrim(occupation_name_snapshot) <> ''),
    roles jsonb NOT NULL CHECK (jsonb_typeof(roles) = 'array'),
    state text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'FINALIZED', 'ABANDONED')),
    created_by uuid NOT NULL REFERENCES platform.account,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid NOT NULL REFERENCES platform.account,
    updated_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    FOREIGN KEY (organization_id, occupation_id)
        REFERENCES platform.baseline_assessment_series(organization_id, occupation_id),
    FOREIGN KEY (blueprint_id, base_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    CHECK ((state = 'OPEN' AND closed_at IS NULL)
        OR (state <> 'OPEN' AND closed_at IS NOT NULL))
);

CREATE UNIQUE INDEX baseline_blueprint_one_open_working_revision
    ON platform.baseline_blueprint_working_revision (organization_id, occupation_id)
    WHERE state = 'OPEN';

ALTER TABLE platform.baseline_assessment_series
    ADD CONSTRAINT baseline_assessment_series_working_revision_fk
        FOREIGN KEY (working_revision_id)
        REFERENCES platform.baseline_blueprint_working_revision(working_revision_id);

CREATE TABLE platform.baseline_assessment_transition (
    transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    occupation_id text NOT NULL,
    series_revision bigint NOT NULL CHECK (series_revision > 1),
    transition text NOT NULL CHECK (transition IN (
        'WORKING_REVISION_STARTED', 'WORKING_REVISION_SAVED', 'BLUEPRINT_FINALIZED',
        'ASSESSMENT_DRAFT_OPENED', 'ASSESSMENT_DRAFT_EDITED', 'ASSESSMENT_REVIEWED',
        'REVIEWED_CANDIDATE_REPLACED', 'ACTIVE_ASSESSMENT_SWITCHED',
        'HISTORICAL_ASSESSMENT_RESTORED', 'ACTIVE_ASSESSMENT_DISABLED',
        'PENDING_CHANGE_ABANDONED')),
    actor_id uuid NOT NULL REFERENCES platform.account,
    occurred_at timestamptz NOT NULL,
    reason text,
    previous_working_revision_id uuid,
    previous_pending_blueprint_id uuid,
    previous_pending_blueprint_version integer,
    previous_open_assessment_version_id uuid,
    previous_active_assessment_version_id uuid,
    working_revision_id uuid,
    pending_blueprint_id uuid,
    pending_blueprint_version integer,
    open_assessment_version_id uuid,
    active_assessment_version_id uuid,
    FOREIGN KEY (organization_id, occupation_id)
        REFERENCES platform.baseline_assessment_series(organization_id, occupation_id),
    FOREIGN KEY (pending_blueprint_id, pending_blueprint_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    FOREIGN KEY (previous_working_revision_id)
        REFERENCES platform.baseline_blueprint_working_revision(working_revision_id),
    FOREIGN KEY (previous_pending_blueprint_id, previous_pending_blueprint_version)
        REFERENCES platform.baseline_blueprint_version(blueprint_id, version),
    FOREIGN KEY (previous_open_assessment_version_id)
        REFERENCES platform.assessment_version(assessment_version_id),
    FOREIGN KEY (previous_active_assessment_version_id)
        REFERENCES platform.assessment_version(assessment_version_id),
    FOREIGN KEY (working_revision_id)
        REFERENCES platform.baseline_blueprint_working_revision(working_revision_id),
    FOREIGN KEY (open_assessment_version_id)
        REFERENCES platform.assessment_version(assessment_version_id),
    FOREIGN KEY (active_assessment_version_id)
        REFERENCES platform.assessment_version(assessment_version_id),
    UNIQUE (organization_id, occupation_id, series_revision),
    CHECK ((previous_pending_blueprint_id IS NULL)
        = (previous_pending_blueprint_version IS NULL)),
    CHECK ((pending_blueprint_id IS NULL) = (pending_blueprint_version IS NULL)),
    CHECK (reason IS NULL OR btrim(reason) <> '')
);
CREATE INDEX baseline_assessment_transition_scope_time_idx
    ON platform.baseline_assessment_transition
        (organization_id, occupation_id, occurred_at DESC);

-- Refuse to choose arbitrarily among historical active definitions.
DO $$
BEGIN
    IF EXISTS (
        SELECT blueprint_id
        FROM platform.assessment_version
        WHERE purpose = 'BASELINE'
          AND blueprint_id IS NOT NULL
          AND publication_state = 'PUBLISHED'
        GROUP BY blueprint_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot backfill baseline lifecycle: a blueprint has multiple published assessments'
            USING ERRCODE = '23505';
    END IF;

    IF EXISTS (
        SELECT identity.blueprint_id
        FROM platform.baseline_blueprint identity
        LEFT JOIN platform.assessment_version active
          ON active.blueprint_id = identity.blueprint_id
         AND active.publication_state = 'PUBLISHED'
        LEFT JOIN platform.assessment_version candidate
          ON candidate.blueprint_id = identity.blueprint_id
         AND candidate.baseline_candidate_state = 'OPEN'
        JOIN platform.baseline_blueprint_version version
          ON version.blueprint_id = identity.blueprint_id
        WHERE identity.organization_id IS NOT NULL
          AND identity.occupation_id IS NOT NULL
          AND candidate.assessment_version_id IS NULL
          AND version.version > coalesce(active.blueprint_version, 0)
        GROUP BY identity.blueprint_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot backfill baseline lifecycle: multiple unconsumed blueprint versions exist'
            USING ERRCODE = '23505';
    END IF;
END;
$$;

INSERT INTO platform.baseline_assessment_series (
    organization_id, occupation_id, blueprint_id, pending_blueprint_version,
    open_assessment_version_id, active_assessment_version_id, created_at, updated_at)
SELECT identity.organization_id,
       identity.occupation_id,
       identity.blueprint_id,
       coalesce(candidate.blueprint_version, pending.version),
       candidate.assessment_version_id,
       active.assessment_version_id,
       identity.created_at,
       greatest(identity.created_at,
           coalesce(candidate.created_at, identity.created_at),
           coalesce(active.created_at, identity.created_at))
FROM platform.baseline_blueprint identity
LEFT JOIN platform.assessment_version candidate
  ON candidate.blueprint_id = identity.blueprint_id
 AND candidate.baseline_candidate_state = 'OPEN'
LEFT JOIN platform.assessment_version active
  ON active.blueprint_id = identity.blueprint_id
 AND active.publication_state = 'PUBLISHED'
LEFT JOIN LATERAL (
    SELECT blueprint_version.version
    FROM platform.baseline_blueprint_version blueprint_version
    WHERE blueprint_version.blueprint_id = identity.blueprint_id
      AND candidate.assessment_version_id IS NULL
      AND blueprint_version.version > coalesce(active.blueprint_version, 0)
    ORDER BY blueprint_version.version DESC
    LIMIT 1
) pending ON true
WHERE identity.organization_id IS NOT NULL
  AND identity.occupation_id IS NOT NULL;

CREATE FUNCTION platform.validate_baseline_assessment_series()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    candidate record;
    active record;
    working record;
BEGIN
    IF NEW.working_revision_id IS NOT NULL THEN
        SELECT organization_id, occupation_id, blueprint_id, state
        INTO working
        FROM platform.baseline_blueprint_working_revision
        WHERE working_revision_id = NEW.working_revision_id;
        IF NOT FOUND OR working.organization_id <> NEW.organization_id
            OR working.occupation_id <> NEW.occupation_id
            OR working.blueprint_id <> NEW.blueprint_id
            OR working.state <> 'OPEN' THEN
            RAISE EXCEPTION 'Working revision does not belong to the open baseline series'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.open_assessment_version_id IS NOT NULL THEN
        SELECT blueprint_id, blueprint_version, publication_state,
               baseline_candidate_state, reviewed_content_hash
        INTO candidate
        FROM platform.assessment_version
        WHERE assessment_version_id = NEW.open_assessment_version_id
          AND purpose = 'BASELINE';
        IF NOT FOUND OR candidate.blueprint_id <> NEW.blueprint_id
            OR candidate.blueprint_version IS DISTINCT FROM NEW.pending_blueprint_version
            OR candidate.publication_state <> 'DRAFT'
            OR candidate.baseline_candidate_state <> 'OPEN' THEN
            RAISE EXCEPTION 'Open assessment candidate does not match its pending blueprint'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.active_assessment_version_id IS NOT NULL THEN
        SELECT blueprint_id, publication_state INTO active
        FROM platform.assessment_version
        WHERE assessment_version_id = NEW.active_assessment_version_id
          AND purpose = 'BASELINE';
        IF NOT FOUND OR active.blueprint_id <> NEW.blueprint_id
            OR active.publication_state <> 'PUBLISHED' THEN
            RAISE EXCEPTION 'Active assessment does not belong to this baseline series'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER baseline_assessment_series_consistent
    BEFORE INSERT OR UPDATE ON platform.baseline_assessment_series
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_assessment_series();

CREATE FUNCTION platform.validate_baseline_management_actor()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    actor_organization_id uuid;
BEGIN
    SELECT organization_id INTO actor_organization_id
    FROM platform.account
    WHERE account_id = CASE
        WHEN TG_TABLE_NAME = 'baseline_assessment_transition' THEN NEW.actor_id
        ELSE NEW.updated_by
    END;
    IF actor_organization_id IS DISTINCT FROM NEW.organization_id THEN
        RAISE EXCEPTION 'Baseline management actor is outside the series organization'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER baseline_working_revision_actor_scope
    BEFORE INSERT OR UPDATE ON platform.baseline_blueprint_working_revision
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_management_actor();
CREATE TRIGGER baseline_transition_actor_scope
    BEFORE INSERT ON platform.baseline_assessment_transition
    FOR EACH ROW EXECUTE FUNCTION platform.validate_baseline_management_actor();

CREATE FUNCTION platform.guard_closed_baseline_working_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.state <> 'OPEN' THEN
        RAISE EXCEPTION 'Baseline working revision history is immutable'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER closed_baseline_working_revision_immutable
    BEFORE UPDATE OR DELETE ON platform.baseline_blueprint_working_revision
    FOR EACH ROW EXECUTE FUNCTION platform.guard_closed_baseline_working_revision();

CREATE TRIGGER immutable_history
    BEFORE UPDATE OR DELETE ON platform.baseline_assessment_transition
    FOR EACH ROW EXECUTE FUNCTION platform.reject_history_mutation();

COMMENT ON TABLE platform.baseline_assessment_series IS
    'Tenant + Occupation coordination row and first lock for baseline lifecycle writes.';
COMMENT ON COLUMN platform.baseline_assessment_series.series_revision IS
    'Optimistic compare-and-set revision; incremented once for every audited pointer transition.';
COMMENT ON TABLE platform.baseline_blueprint_working_revision IS
    'Mutable JSON working copy; finalized blueprint versions remain normalized and immutable.';
COMMENT ON COLUMN platform.assessment_version.baseline_candidate_state IS
    'OPEN marks the sole editable/reviewed candidate; CLOSED retains abandoned or published history.';
