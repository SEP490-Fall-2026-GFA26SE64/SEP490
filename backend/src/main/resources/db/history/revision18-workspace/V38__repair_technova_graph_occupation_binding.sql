-- Correct the known code-vs-node-ID bootstrap typo only for the unconfigured binding.
-- Learner snapshots, Blueprint scopes, attempts, profiles, pins and history are not rewritten.
UPDATE platform.workspace_baseline_resource AS binding
SET graph_occupation_id = 'OCC-15-1252.00'
WHERE binding.organization_id = 'e0000000-0000-0000-0000-000000000001'
  AND binding.occupation_reference_id = 'f0000000-0000-0000-0000-000000000001'
  AND binding.graph_occupation_id = '15-1252.00'
  AND binding.question_bank_id IS NULL
  AND binding.model_version_id IS NULL
  AND binding.mastery_mapping_version_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM platform.workspace_baseline_resource AS current
      WHERE current.organization_id = binding.organization_id
        AND current.graph_occupation_id = 'OCC-15-1252.00'
  );
