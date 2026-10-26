-- RQ2 is independent of learner/model evaluation: no invented model or account FK.
CREATE TABLE platform.research_run (
    id uuid PRIMARY KEY,
    status text NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
    created_by text NOT NULL CHECK (btrim(created_by) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);
CREATE UNIQUE INDEX research_one_active_run ON platform.research_run ((1)) WHERE status IN ('QUEUED','RUNNING');
CREATE TABLE platform.research_graph (
    run_id uuid NOT NULL REFERENCES platform.research_run(id),
    node_count integer NOT NULL CHECK (node_count IN (1000,5000,10000)),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    PRIMARY KEY (run_id,node_count)
);
