package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Scoped mutable draft and pointer; immutable versions retain the original policy/attempt identity. */
public interface ScopedAssessmentPolicyJpaRepository extends Repository<AssessmentRulePolicyEntity,UUID> {
    interface Draft {
        UUID getId();long getRevision();String getConfiguration();String getCatalogHash();Instant getUpdatedAt();String getEditorState();
    }
    interface Summary {
        String getScopeKey();long getVersionCount();UUID getDraftId();UUID getActiveId();Long getActiveVersion();long getRevision();boolean getDraftIncomplete();
        long getAbandonedCount();
    }
    interface AbandonedDraft extends Draft { Instant getAbandonedAt(); }
    @Query(value="""
            WITH keys AS (
                SELECT scope_key FROM platform.assessment_rule_policy_version WHERE organization_id=:org AND purpose=:purpose AND scope_key IS NOT NULL
                UNION SELECT scope_key FROM platform.assessment_rule_policy_draft WHERE organization_id=:org AND purpose=:purpose
                UNION SELECT scope_key FROM platform.assessment_rule_abandoned_draft WHERE organization_id=:org AND purpose=:purpose
            ) SELECT k.scope_key AS scopeKey,
                (SELECT count(*) FROM platform.assessment_rule_policy_version v WHERE v.organization_id=:org AND v.purpose=:purpose AND v.scope_key=k.scope_key) AS versionCount,
                d.id AS draftId,a.current_policy_version_id AS activeId,p.version AS activeVersion,coalesce(a.revision,0) AS revision,
                (d.id IS NOT NULL AND (d.configuration IS NULL OR d.editor_state IS NOT NULL AND NOT coalesce((d.editor_state->>'completed')::boolean,false))) AS draftIncomplete,
                (SELECT count(*) FROM platform.assessment_rule_abandoned_draft h WHERE h.organization_id=:org AND h.purpose=:purpose AND h.scope_key=k.scope_key) AS abandonedCount
            FROM keys k LEFT JOIN platform.assessment_rule_policy_draft d ON d.organization_id=:org AND d.purpose=:purpose AND d.scope_key=k.scope_key
            LEFT JOIN platform.assessment_rule_scoped_activation a ON a.organization_id=:org AND a.purpose=:purpose AND a.scope_key=k.scope_key
            LEFT JOIN platform.assessment_rule_policy_version p ON p.id=a.current_policy_version_id
            ORDER BY k.scope_key LIMIT 10001
            """,nativeQuery=true)
    List<Summary> summaries(@Param("org") UUID org,@Param("purpose") String purpose);
    @Query(value="""
            SELECT id,revision,configuration::text AS configuration,catalog_hash AS catalogHash,updated_at AS updatedAt,editor_state::text AS editorState
            FROM platform.assessment_rule_policy_draft WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope
            """,nativeQuery=true)
    Optional<Draft> draft(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Query(value="""
            SELECT id,revision,configuration::text AS configuration,catalog_hash AS catalogHash,updated_at AS updatedAt,
                editor_state::text AS editorState,abandoned_at AS abandonedAt
            FROM platform.assessment_rule_abandoned_draft WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope
            ORDER BY abandoned_at DESC,id LIMIT :#{#pageable.pageSize} OFFSET :#{#pageable.offset}
            """,nativeQuery=true)
    List<AbandonedDraft> abandoned(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,org.springframework.data.domain.Pageable pageable);
    @Query(value="SELECT count(*) FROM platform.assessment_rule_abandoned_draft WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope",nativeQuery=true)
    long abandonedCount(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Modifying(flushAutomatically=true)
    @Query(value="""
            INSERT INTO platform.assessment_rule_abandoned_draft(organization_id,purpose,scope_key,id,revision,configuration,editor_state,
                catalog_hash,updated_by,updated_at,abandoned_by)
            SELECT organization_id,purpose,scope_key,id,revision,configuration,editor_state,catalog_hash,updated_by,updated_at,:actor
            FROM platform.assessment_rule_policy_draft
            WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope AND id=:id AND revision=:expected
            """,nativeQuery=true)
    int abandon(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,
                @Param("expected") long expected,@Param("actor") UUID actor);
    @Query(value="""
            SELECT p.* FROM platform.assessment_rule_policy_version p JOIN platform.assessment_rule_scoped_activation a
            ON a.organization_id=p.organization_id AND a.purpose=p.purpose AND a.scope_key=p.scope_key AND a.current_policy_version_id=p.id
            WHERE a.organization_id=:org AND a.purpose=:purpose AND a.scope_key=:scope FOR SHARE OF a
            """,nativeQuery=true)
    Optional<AssessmentRulePolicyEntity> active(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Query(value="SELECT revision FROM platform.assessment_rule_scoped_activation WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope",nativeQuery=true)
    Optional<Long> revision(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Query("select p from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.scopeKey=:scope order by p.version desc")
    List<AssessmentRulePolicyEntity> versions(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,org.springframework.data.domain.Pageable page);
    @Query("select coalesce(max(p.version),0) from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.scopeKey=:scope")
    long maxVersion(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Query("select count(p) from AssessmentRulePolicyEntity p where p.organizationId=:org and p.purpose=:purpose and p.scopeKey=:scope")
    long versionCount(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope);
    @Modifying(flushAutomatically=true)
    @Query(value="""
            INSERT INTO platform.assessment_rule_policy_draft(organization_id,purpose,scope_key,id,revision,configuration,catalog_hash,updated_by,updated_at)
            VALUES(:org,:purpose,:scope,:id,1,CAST(:body AS jsonb),:catalog,:actor,clock_timestamp()) ON CONFLICT DO NOTHING
            """,nativeQuery=true)
    int create(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,
               @Param("body") String body,@Param("catalog") String catalog,@Param("actor") UUID actor);
    @Modifying(flushAutomatically=true)
    @Query(value="""
            UPDATE platform.assessment_rule_policy_draft SET configuration=CAST(:body AS jsonb),editor_state=NULL,catalog_hash=:catalog,
                revision=revision+1,updated_by=:actor,updated_at=clock_timestamp()
            WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope AND id=:id AND revision=:expected
            """,nativeQuery=true)
    int update(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,
               @Param("expected") long expected,@Param("body") String body,@Param("catalog") String catalog,@Param("actor") UUID actor);
    @Modifying(flushAutomatically=true)
    @Query(value="""
            UPDATE platform.assessment_rule_policy_draft SET configuration=CAST(:body AS jsonb),editor_state=CAST(:editor AS jsonb),catalog_hash=:catalog,
                revision=revision+1,updated_by=:actor,updated_at=clock_timestamp()
            WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope AND id=:id AND revision=:expected
            """,nativeQuery=true)
    int updateEditor(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,
                     @Param("expected") long expected,@Param("body") String body,@Param("editor") String editor,@Param("catalog") String catalog,@Param("actor") UUID actor);
    @Modifying(flushAutomatically=true)
    @Query(value="""
            INSERT INTO platform.assessment_rule_scoped_activation(organization_id,purpose,scope_key,current_policy_version_id,revision,changed_by,changed_at)
            VALUES(:org,:purpose,:scope,:id,1,:actor,clock_timestamp())
            ON CONFLICT(organization_id,purpose,scope_key) DO UPDATE SET current_policy_version_id=:id,
            revision=platform.assessment_rule_scoped_activation.revision+1,changed_by=:actor,changed_at=clock_timestamp()
            """,nativeQuery=true)
    int activate(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,@Param("actor") UUID actor);
    @Modifying(flushAutomatically=true)
    @Query(value="DELETE FROM platform.assessment_rule_policy_draft WHERE organization_id=:org AND purpose=:purpose AND scope_key=:scope AND id=:id AND revision=:expected",nativeQuery=true)
    int consume(@Param("org") UUID org,@Param("purpose") String purpose,@Param("scope") String scope,@Param("id") UUID id,@Param("expected") long expected);
}
