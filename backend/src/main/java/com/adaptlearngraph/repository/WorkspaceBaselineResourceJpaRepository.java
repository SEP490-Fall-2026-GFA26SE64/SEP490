package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.WorkspaceBaselineResourceEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization baseline resource bindings (bank/model/mapping per graph jobPosition). Every method is scoped by
 * organization; bank ownership stays enforced by the database trigger. The row lock and the idempotent development
 * seed upsert stay native.
 */
public interface WorkspaceBaselineResourceJpaRepository extends Repository<WorkspaceBaselineResourceEntity, WorkspaceBaselineResourceEntity.Key>,
        InsertOnlyRepository<WorkspaceBaselineResourceEntity> {
    /** A stored binding with its display name and whether its department/job-position reference grant is still active. */
    record Stored(String jobPositionId, String name, UUID bankId, UUID modelId, UUID mappingId, Boolean enabled, Boolean referenceGrant) {}

    record Tuple(UUID bankId, UUID modelId, UUID mappingId) {}

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository$Stored(
              r.graphJobPositionId, coalesce(o.name, r.graphJobPositionId), r.questionBankId, r.modelVersionId, r.masteryMappingVersionId,
              case when r.jobPositionReferenceId is null or (o.active = true and d.active = true) then true else false end,
              case when r.jobPositionReferenceId is not null then true else false end)
            from WorkspaceBaselineResourceEntity r
            left join JobPositionDepartmentReferenceEntity o
              on o.jobPositionReferenceId = r.jobPositionReferenceId and o.organizationId = r.organizationId
            left join DepartmentReferenceEntity d on d.departmentId = o.departmentId and d.organizationId = o.organizationId
            where r.organizationId = :org
            order by r.graphJobPositionId
            """)
    List<Stored> stored(@Param("org") UUID organizationId);

    /** Bank of an item whose bank creator belongs to the organization. */
    @Query("""
            select i.questionBankId from ItemVersionEntity i, QuestionBankEntity b, AccountEntity a
            where b.questionBankId = i.questionBankId and a.accountId = b.createdBy
              and i.itemVersionId = :item and a.organizationId = :org
            """)
    List<UUID> itemBank(@Param("org") UUID organizationId, @Param("item") UUID itemVersionId);

    // Native: row lock (FOR UPDATE) on the binding inside the caller's transaction.
    @Query(value = """
            SELECT graph_job_position_id FROM platform.workspace_baseline_resource
            WHERE organization_id = :org AND graph_job_position_id = :jobPosition FOR UPDATE
            """, nativeQuery = true)
    List<String> lock(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository$Tuple(r.questionBankId, r.modelVersionId, r.masteryMappingVersionId)
            from WorkspaceBaselineResourceEntity r where r.organizationId = :org and r.graphJobPositionId = :jobPosition
            """)
    List<Tuple> tuple(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);

    /** Compare-and-set of the whole tuple; returns the changed row count (1 or 0 when stale). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceBaselineResourceEntity r
            set r.questionBankId = :bank, r.modelVersionId = :model, r.masteryMappingVersionId = :mapping
            where r.organizationId = :org and r.graphJobPositionId = :jobPosition
              and r.questionBankId is not distinct from :oldBank
              and r.modelVersionId is not distinct from :oldModel
              and r.masteryMappingVersionId is not distinct from :oldMapping
            """)
    int replace(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId,
            @Param("bank") UUID bankId, @Param("model") UUID modelId, @Param("mapping") UUID mappingId,
            @Param("oldBank") UUID expectedBankId, @Param("oldModel") UUID expectedModelId, @Param("oldMapping") UUID expectedMappingId);

    // Native: idempotent development seed (ON CONFLICT DO NOTHING on any unique key; existing bindings are never overwritten).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_baseline_resource(organization_id,job_position_reference_id,graph_job_position_id,question_bank_id,
              model_version_id,mastery_mapping_version_id)
            VALUES(:org,:reference,:jobPosition,:bank,:model,:mapping) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int seedIfAbsent(@Param("org") UUID organizationId, @Param("reference") UUID jobPositionReferenceId,
            @Param("jobPosition") String jobPositionId, @Param("bank") UUID bankId, @Param("model") UUID modelId,
            @Param("mapping") UUID mappingId);

    // Native: same idempotent seed with model/mapping left NULL (no untyped NULL parameter binding).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_baseline_resource(organization_id,job_position_reference_id,graph_job_position_id,question_bank_id,
              model_version_id,mastery_mapping_version_id)
            VALUES(:org,:reference,:jobPosition,:bank,NULL,NULL) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int seedBankIfAbsent(@Param("org") UUID organizationId, @Param("reference") UUID jobPositionReferenceId,
            @Param("jobPosition") String jobPositionId, @Param("bank") UUID bankId);

    // Native: idempotent development seed (ON CONFLICT (organization_id, graph_job_position_id) DO NOTHING) of an unbound jobPosition.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_baseline_resource(organization_id, job_position_reference_id, graph_job_position_id)
            VALUES (:org, :reference, :jobPosition)
            ON CONFLICT (organization_id, graph_job_position_id) DO NOTHING
            """, nativeQuery = true)
    int seedJobPositionIfAbsent(@Param("org") UUID organizationId, @Param("reference") UUID jobPositionReferenceId,
            @Param("jobPosition") String jobPositionId);

    /** Development seed: binds model/mapping only while both are still unset. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceBaselineResourceEntity r set r.modelVersionId = :model, r.masteryMappingVersionId = :mapping
            where r.organizationId = :org and r.graphJobPositionId = :jobPosition and r.questionBankId = :bank
              and r.modelVersionId is null and r.masteryMappingVersionId is null
            """)
    int bindUnsetVersions(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("bank") UUID bankId,
            @Param("model") UUID modelId, @Param("mapping") UUID mappingId);

    @Query("""
            select case when count(r) > 0 then true else false end from WorkspaceBaselineResourceEntity r
            where r.organizationId = :org and r.graphJobPositionId = :jobPosition and r.questionBankId = :bank
              and r.modelVersionId = :model and r.masteryMappingVersionId = :mapping
            """)
    boolean bound(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("bank") UUID bankId,
            @Param("model") UUID modelId, @Param("mapping") UUID mappingId);

    @Query("""
            select case when count(r) > 0 then true else false end from WorkspaceBaselineResourceEntity r
            where r.organizationId = :org and r.jobPositionReferenceId = :reference and r.graphJobPositionId = :jobPosition
              and r.questionBankId = :bank and r.modelVersionId = :model and r.masteryMappingVersionId = :mapping
            """)
    boolean boundReference(@Param("org") UUID organizationId, @Param("reference") UUID jobPositionReferenceId,
            @Param("jobPosition") String jobPositionId, @Param("bank") UUID bankId, @Param("model") UUID modelId,
            @Param("mapping") UUID mappingId);
}
