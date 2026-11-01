-- Add the ordered lesson representation without changing authorship, bodies or decisions.
CREATE FUNCTION platform.legacy_content_lessons(content jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT CASE WHEN content IS NULL OR content ? 'lessons' THEN content
    WHEN coalesce(content->>'markdown','') <> '' THEN content || jsonb_build_object('lessons',jsonb_build_array(jsonb_build_object(
        'id',(content->>'id')||'-text','title',content->>'title','type','TEXT',
        'body',content->>'markdown','bodyFormat','MARKDOWN',
        'durationSeconds',greatest(60,ceil(cardinality(regexp_split_to_array(content->>'markdown','\s+'))/200.0)::integer*60),
        'durationSource','ESTIMATED','videoSource',null,'assetId',null,'videoUrl',null)))
    ELSE content || '{"lessons":[]}'::jsonb END;
$$;
UPDATE platform.module_authoring_content SET document=platform.legacy_content_lessons(document)
WHERE NOT document ? 'lessons';
UPDATE platform.module_authoring m SET document=jsonb_set(m.document,'{revisions}',(
    SELECT jsonb_agg(CASE WHEN revision->'payload'->'content' IS NOT NULL THEN
        jsonb_set(revision,'{payload,content}',platform.legacy_content_lessons(revision->'payload'->'content'))
        ELSE revision END ORDER BY ordinal)
    FROM jsonb_array_elements(m.document->'revisions') WITH ORDINALITY AS entries(revision,ordinal)
)) WHERE jsonb_typeof(m.document->'revisions')='array'
AND EXISTS(SELECT 1 FROM jsonb_array_elements(m.document->'revisions') r WHERE NOT (r->'payload'->'content') ? 'lessons');
DROP FUNCTION platform.legacy_content_lessons(jsonb);
