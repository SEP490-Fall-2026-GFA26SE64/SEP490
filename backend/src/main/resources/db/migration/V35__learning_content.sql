-- Content and progress are PostgreSQL owned; binary objects remain private in MinIO.
CREATE TABLE platform.learning_upload_settings (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    video_bytes bigint NOT NULL CHECK (video_bytes BETWEEN 1048576 AND 10737418240),
    image_bytes bigint NOT NULL CHECK (image_bytes BETWEEN 1024 AND 104857600),
    zip_bytes bigint NOT NULL CHECK (zip_bytes BETWEEN 1048576 AND 10737418240),
    version bigint NOT NULL DEFAULT 1,
    changed_by text,
    changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform.learning_upload_settings(singleton,video_bytes,image_bytes,zip_bytes)
VALUES(true,209715200,5242880,524288000);
CREATE TABLE platform.learning_settings_audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
    previous_value jsonb NOT NULL, next_value jsonb NOT NULL
);
CREATE TABLE platform.learning_asset (
    id uuid PRIMARY KEY, organization_id text NOT NULL, created_by text NOT NULL,
    object_key text NOT NULL UNIQUE, filename text NOT NULL, media_type text NOT NULL,
    byte_size bigint NOT NULL CHECK(byte_size>0), sha256 text NOT NULL,
    duration_seconds integer CHECK(duration_seconds>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_asset_org_idx ON platform.learning_asset(organization_id);
CREATE TABLE platform.learning_video_verification (
    organization_id text NOT NULL, actor_id text NOT NULL, video_url text NOT NULL,
    duration_seconds integer NOT NULL CHECK(duration_seconds>0), verified_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(organization_id,actor_id,video_url)
);
CREATE TABLE platform.learning_import (
    id uuid PRIMARY KEY, organization_id text NOT NULL, actor_id text NOT NULL,
    document jsonb NOT NULL, state text NOT NULL CHECK(state IN ('PREVIEW','COMMITTED')),
    created_at timestamptz NOT NULL DEFAULT now(), committed_at timestamptz
);
-- Explicit manual origin: no fabricated recommendation runs or assessment evidence.
CREATE TABLE platform.manual_learning_pathway (
    id uuid PRIMARY KEY, organization_id uuid NOT NULL, learner_id uuid NOT NULL,
    expert_id uuid NOT NULL, title text NOT NULL, module_ids jsonb NOT NULL CHECK(jsonb_typeof(module_ids)='array'),
    confirmed_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(learner_id,organization_id) REFERENCES platform.account(account_id,organization_id),
    FOREIGN KEY(expert_id,organization_id) REFERENCES platform.account(account_id,organization_id)
);
CREATE INDEX manual_pathway_learner_idx ON platform.manual_learning_pathway(organization_id,learner_id);
CREATE TABLE platform.learning_lesson_progress (
    organization_id text NOT NULL, learner_id text NOT NULL, module_id text NOT NULL,
    revision integer NOT NULL CHECK(revision>0), lesson_id text NOT NULL,
    position_seconds double precision NOT NULL DEFAULT 0 CHECK(position_seconds>=0),
    watched_intervals jsonb NOT NULL DEFAULT '[]', reached_end boolean NOT NULL DEFAULT false,
    completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(organization_id,learner_id,module_id,revision,lesson_id),
    FOREIGN KEY(organization_id,module_id) REFERENCES platform.module_authoring(organization_id,module_id)
);
CREATE TABLE platform.learning_resume (
    organization_id text NOT NULL, learner_id text NOT NULL, module_id text NOT NULL,
    lesson_id text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(organization_id,learner_id,module_id)
);
CREATE TABLE platform.learning_version_switch (
    id uuid PRIMARY KEY, organization_id text NOT NULL, learner_id text NOT NULL,
    module_id text NOT NULL, from_revision integer NOT NULL, to_revision integer NOT NULL,
    switched_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform.learning_notification (
    id uuid PRIMARY KEY, organization_id text NOT NULL, recipient_id text NOT NULL,
    event_key text NOT NULL, kind text NOT NULL, module_id text NOT NULL,
    title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz, mail_sent_at timestamptz, mail_attempts integer NOT NULL DEFAULT 0,
    mail_next_attempt timestamptz NOT NULL DEFAULT now(), mail_error text,
    UNIQUE(recipient_id,event_key)
);
-- Enrich snapshots without rewriting old bodies, actors, decisions or revision numbers.
-- Legacy content is normalized in the typed reader; missing content is never fabricated.
