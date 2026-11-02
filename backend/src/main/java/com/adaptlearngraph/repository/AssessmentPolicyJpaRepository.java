package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AssessmentPolicyVersionEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization assessment policy versions, activation pointer, history and command receipts; every query is scoped
 * by organization. Native statements keep the database clock (clock_timestamp()) and the FOR SHARE activation lock.
 */
public interface AssessmentPolicyJpaRepository
        extends Repository<AssessmentPolicyVersionEntity, UUID>, InsertOnlyRepository<AssessmentPolicyVersionEntity> {

    record VersionRow(UUID organizationId, UUID policyVersionId, String configurationHash, Double stopSe, Double highConfidenceSe,
                      Double mediumConfidenceSe, Double k, Long version, UUID createdBy, Instant createdAt) {}

    record StateRow(Long revision, UUID currentPolicyVersionId) {}

    record Receipt(String requestHash, String responsePayload) {}

    String VERSION = """
            select new com.adaptlearngraph.repository.AssessmentPolicyJpaRepository$VersionRow(v.organizationId, v.policyVersionId,
                v.configurationHash, v.stopSe, v.highConfidenceSe, v.mediumConfidenceSe, v.k, v.version, v.createdBy, v.createdAt)
            from AssessmentPolicyVersionEntity v
            """;

    @Query(value = "SELECT organization_id FROM platform.baseline_assessment_policy_activation WHERE organization_id = :org FOR SHARE",
            nativeQuery = true)
    List<UUID> shareLockActivation(@Param("org") UUID organizationId);

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentPolicyJpaRepository$StateRow(a.revision, a.currentPolicyVersionId)
            from AssessmentPolicyActivationEntity a where a.organizationId = :org
            """)
    Optional<StateRow> state(@Param("org") UUID organizationId);

    @Query(VERSION + "where v.organizationId = :org and v.policyVersionId = :id")
    Optional<VersionRow> version(@Param("org") UUID organizationId, @Param("id") UUID policyVersionId);

    @Query(VERSION + "where v.organizationId = :org and v.configurationHash = :hash")
    Optional<VersionRow> byHash(@Param("org") UUID organizationId, @Param("hash") String configurationHash);

    @Query(VERSION + "where v.organizationId = :org order by v.version desc")
    List<VersionRow> page(@Param("org") UUID organizationId, Pageable page);

    @Query("select count(v) from AssessmentPolicyVersionEntity v where v.organizationId = :org")
    long count(@Param("org") UUID organizationId);

    @Query("select coalesce(max(v.version), 0) from AssessmentPolicyVersionEntity v where v.organizationId = :org")
    long maxVersion(@Param("org") UUID organizationId);

    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.baseline_assessment_policy_activation(organization_id) VALUES(:org) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int ensureScope(@Param("org") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.baseline_assessment_policy_activation SET current_policy_version_id = :id, revision = :next,
              changed_by = :actor, changed_at = clock_timestamp() WHERE organization_id = :org AND revision = :revision
            """, nativeQuery = true)
    int activate(@Param("org") UUID organizationId, @Param("id") UUID policyVersionId, @Param("actor") UUID actor,
            @Param("revision") long expectedRevision, @Param("next") long nextRevision);

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentPolicyJpaRepository$Receipt(c.requestHash, c.responsePayload)
            from AssessmentPolicyCommandEntity c where c.organizationId = :org and c.actorId = :actor and c.commandKey = :key
            """)
    Optional<Receipt> receipt(@Param("org") UUID organizationId, @Param("actor") UUID actor, @Param("key") UUID commandKey);

    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.audit_event(audit_event_id, actor_id, service_name, action, resource_id, resource_revision, occurred_at,
              outcome, correlation_id)
            VALUES(:audit, :actor, 'adaptive-baseline-policy', :operation, :org, :hash, clock_timestamp(), 'RECORDED', :key)
            """, nativeQuery = true)
    int auditReceipt(@Param("audit") UUID auditId, @Param("actor") UUID actor, @Param("operation") String operation,
            @Param("org") UUID organizationId, @Param("hash") String hash, @Param("key") UUID commandKey);
}