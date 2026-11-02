package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintVersionEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Blueprint history/count listing for one organization's granted Occupations. Native: UNION ALL of drafts and versions
 * with jsonb operators (->>, jsonb_exists) and LIMIT/OFFSET over the combined rows. Two name sources (version snapshot or
 * workspace reference) and two sort directions are fixed statements, so no client value ever controls SQL syntax.
 * Rows: [blueprint_id, working_revision_id, version, name, occupation_id, occupation_name, type, status, date_label, date,
 * active_count, update_required, revision, current_version].
 */
public interface AdaptiveBlueprintListingJpaRepository
        extends Repository<BaselineAdaptiveBlueprintVersionEntity, BaselineAdaptiveBlueprintVersionEntity.Key> {

    String SNAPSHOT_NAME = """
            coalesce((SELECT v.occupation_name_snapshot FROM platform.baseline_adaptive_blueprint_version v
                WHERE v.organization_id=:org AND v.blueprint_id=w.blueprint_id
                ORDER BY v.version DESC LIMIT 1),w.occupation_id)
            """;
    String WORKSPACE_NAME = """
            coalesce((SELECT o.name FROM platform.workspace_baseline_resource r
                JOIN platform.occupation_department_reference o
                  ON o.organization_id=r.organization_id AND o.occupation_reference_id=r.occupation_reference_id
                JOIN platform.department_reference d ON d.organization_id=o.organization_id AND d.department_id=o.department_id
                WHERE r.organization_id=w.organization_id AND r.graph_occupation_id=w.occupation_id AND o.active AND d.active),
            """ + SNAPSHOT_NAME + ")";
    String HEAD = """
            WITH counts AS (
                SELECT blueprint_id,blueprint_version,count(*) AS active_count
                FROM platform.baseline_adaptive_attempt
                WHERE organization_id=:org AND occupation_id IN (:grants) AND state='IN_PROGRESS'
                GROUP BY blueprint_id,blueprint_version
            ), rows AS (
                SELECT w.blueprint_id,w.working_revision_id,NULL::integer AS version,w.configuration->>'name' AS name,
                    w.occupation_id,""";
    String TAIL = """
             AS occupation_name,
                    'DRAFT' AS type,'DRAFT' AS status,'UPDATED' AS date_label,w.updated_at AS date,
                    0::bigint AS active_count,NOT jsonb_exists(w.configuration,'occupationBounds') AS update_required,
                    w.revision,a.blueprint_version AS current_version
                FROM platform.baseline_adaptive_blueprint_working_revision w
                LEFT JOIN platform.baseline_blueprint_activation a
                    ON a.organization_id=w.organization_id AND a.occupation_id=w.occupation_id AND a.blueprint_id=w.blueprint_id
                WHERE w.organization_id=:org AND w.occupation_id IN (:grants) AND w.state='OPEN'
                UNION ALL
                SELECT v.blueprint_id,NULL::uuid,v.version,v.name,v.occupation_id,v.occupation_name_snapshot,'VERSION',
                    CASE WHEN a.blueprint_version=v.version THEN 'ACTIVE'
                         WHEN coalesce(c.active_count,0)>0 THEN 'RETIRING' ELSE 'INACTIVE' END,
                    'ACTIVATED',v.created_at,coalesce(c.active_count,0),v.scope_policy IS NULL,
                    coalesce(a.activation_revision,0),a.blueprint_version
                FROM platform.baseline_adaptive_blueprint_version v
                LEFT JOIN platform.baseline_blueprint_activation a
                    ON a.organization_id=v.organization_id AND a.occupation_id=v.occupation_id AND a.blueprint_id=v.blueprint_id
                LEFT JOIN counts c ON c.blueprint_id=v.blueprint_id AND c.blueprint_version=v.version
                WHERE v.organization_id=:org AND v.occupation_id IN (:grants)
            ), filtered AS (
                SELECT * FROM rows WHERE strpos(lower(name),lower(CAST(:search AS text)))>0
                    AND (CAST(:status AS text) IS NULL OR status=CAST(:status AS text))
                    AND (CAST(:occupation AS text) IS NULL OR occupation_id=CAST(:occupation AS text))
            )
            """;
    String SNAPSHOT = HEAD + SNAPSHOT_NAME + TAIL;
    String WORKSPACE = HEAD + WORKSPACE_NAME + TAIL;
    String COUNT = "SELECT count(*) FROM filtered";
    String PAGE = "SELECT * FROM filtered ORDER BY date ";
    String TIEBREAK = ",type,blueprint_id,working_revision_id,version LIMIT :size OFFSET :offset";

    @Query(value = SNAPSHOT + COUNT, nativeQuery = true)
    long countBySnapshotName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId);

    @Query(value = WORKSPACE + COUNT, nativeQuery = true)
    long countByWorkspaceName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId);

    @Query(value = SNAPSHOT + PAGE + "DESC" + TIEBREAK, nativeQuery = true)
    List<Object[]> newestBySnapshotName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId,
            @Param("size") int size, @Param("offset") long offset);

    @Query(value = SNAPSHOT + PAGE + "ASC" + TIEBREAK, nativeQuery = true)
    List<Object[]> oldestBySnapshotName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId,
            @Param("size") int size, @Param("offset") long offset);

    @Query(value = WORKSPACE + PAGE + "DESC" + TIEBREAK, nativeQuery = true)
    List<Object[]> newestByWorkspaceName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId,
            @Param("size") int size, @Param("offset") long offset);

    @Query(value = WORKSPACE + PAGE + "ASC" + TIEBREAK, nativeQuery = true)
    List<Object[]> oldestByWorkspaceName(@Param("org") UUID organizationId, @Param("grants") Collection<String> grants,
            @Param("search") String search, @Param("status") String status, @Param("occupation") String occupationId,
            @Param("size") int size, @Param("offset") long offset);
}
