-- Preserve immutable authorship and existing effective ownership. No human owner is invented for seed records.
UPDATE platform.module_authoring
SET document = jsonb_set(document, '{responsibleExpertId}', COALESCE(document->'createdBy', 'null'::jsonb), true)
WHERE NOT (document ? 'responsibleExpertId') OR document->'responsibleExpertId' = 'null'::jsonb;
