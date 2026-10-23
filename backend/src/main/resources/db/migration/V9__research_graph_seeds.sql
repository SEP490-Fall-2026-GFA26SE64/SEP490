-- Preserve every legacy snapshot while allowing one graph per seed/size in a study.
ALTER TABLE platform.research_graph ADD COLUMN seed bigint;
UPDATE platform.research_graph SET seed = (payload->>'seed')::bigint;
ALTER TABLE platform.research_graph ALTER COLUMN seed SET NOT NULL;
ALTER TABLE platform.research_graph ADD CONSTRAINT research_graph_seed_safe CHECK (seed BETWEEN 0 AND 9007199254740991);
ALTER TABLE platform.research_graph DROP CONSTRAINT research_graph_pkey;
ALTER TABLE platform.research_graph ADD PRIMARY KEY (run_id,node_count,seed);
