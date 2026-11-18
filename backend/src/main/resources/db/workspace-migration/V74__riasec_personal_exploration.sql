-- New personal exploration flow. Does not restore retired attempts or catalog data.
CREATE TABLE platform.riasec_workspace (
  organization_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES platform.account(account_id),
  draft_id uuid,
  answers jsonb NOT NULL DEFAULT '{}',
  revision bigint NOT NULL DEFAULT 0,
  editor_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, account_id),
  CHECK (jsonb_typeof(answers) = 'object')
);
CREATE TABLE platform.riasec_result (
  result_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  account_id uuid NOT NULL,
  answers jsonb NOT NULL,
  scores jsonb NOT NULL,
  instrument_version text NOT NULL,
  scoring_version text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  ai_status text NOT NULL CHECK (ai_status IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED')),
  ai_deadline timestamptz NOT NULL,
  run_id uuid NOT NULL,
  model text,
  prompt_version text,
  recommendations jsonb,
  failure_code text,
  FOREIGN KEY (organization_id, account_id) REFERENCES platform.riasec_workspace,
  CHECK (jsonb_typeof(answers)='object' AND jsonb_typeof(scores)='object')
);
CREATE INDEX riasec_result_owner_idx ON platform.riasec_result(organization_id,account_id,submitted_at DESC,result_id DESC);
CREATE INDEX riasec_result_queue_idx ON platform.riasec_result(ai_status,submitted_at) WHERE ai_status IN ('QUEUED','PROCESSING');
CREATE INDEX riasec_result_deleted_idx ON platform.riasec_result(deleted_at) WHERE deleted_at IS NOT NULL;
-- This draft has never been applied (local Flyway ends at V65; no RIASEC tables).
-- Approved 2026-11-17: JobPosition profiles belong only in Neo4j, no PostgreSQL copy.
