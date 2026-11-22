CREATE TABLE platform.certificate_authoring (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, author_id uuid NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), skill_id text NOT NULL, knowledge_level text NOT NULL,
 skill_name text NOT NULL, input jsonb NOT NULL,
 state text NOT NULL CHECK(state IN ('DRAFT','SUBMITTED','REJECTED','PUBLISHING','PUBLISH_FAILED','PUBLISHED')),
 reviewer_id uuid, reason text NOT NULL DEFAULT '', definition_id text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(knowledge_level IN ('FOUNDATION','INTERMEDIATE','ADVANCED'))
);
CREATE UNIQUE INDEX certificate_authoring_open_scope ON platform.certificate_authoring(organization_id,skill_id,knowledge_level)
 WHERE state IN ('DRAFT','SUBMITTED','REJECTED','PUBLISHING','PUBLISH_FAILED');
CREATE TABLE platform.certificate_authoring_batch (
 organization_id uuid NOT NULL, actor_id uuid NOT NULL, key uuid NOT NULL, hash text NOT NULL, ids jsonb NOT NULL,
 PRIMARY KEY(organization_id,actor_id,key)
);
CREATE TABLE platform.certificate_authoring_view (
 organization_id uuid NOT NULL, draft_id uuid NOT NULL REFERENCES platform.certificate_authoring(id),
 revision bigint NOT NULL, reviewer_id uuid NOT NULL, viewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(draft_id,revision,reviewer_id)
);
CREATE TABLE platform.certificate_authoring_event (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, draft_id uuid NOT NULL REFERENCES platform.certificate_authoring(id),
 revision bigint NOT NULL, actor_id uuid NOT NULL, action text NOT NULL, snapshot jsonb NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
