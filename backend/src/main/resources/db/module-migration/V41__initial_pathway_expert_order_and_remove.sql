-- Additive workspace draft commands; existing audit/history rows and revision formats are retained.
ALTER TABLE platform.initial_pathway_override DROP CONSTRAINT initial_pathway_override_action_check;
ALTER TABLE platform.initial_pathway_override ADD CONSTRAINT initial_pathway_override_action_check
    CHECK (action IN ('INCLUDE','EXCLUDE','MOVE_UP','MOVE_DOWN','REMOVE'));
