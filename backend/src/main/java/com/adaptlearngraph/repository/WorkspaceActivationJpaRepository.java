package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.WorkspaceActivationEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Member invitations; reads and writes are scoped by organization, or by the single-use proof hash. */
public interface WorkspaceActivationJpaRepository
        extends Repository<WorkspaceActivationEntity, UUID>, InsertOnlyRepository<WorkspaceActivationEntity> {

    record Pending(UUID activationId, UUID organizationId, Instant lastSentAt) {}

    record Terms(String fullName, String email, List<String> roles, UUID departmentId, UUID occupationReferenceId,
                 Instant expiresAt, Instant consumedAt) {}

    record Listed(UUID activationId, String fullName, String email, List<String> roles, UUID departmentId,
                  String departmentName, UUID occupationReferenceId, String occupationName, Instant createdAt,
                  Instant expiresAt, String jobStatus) {}

    @Query(value = "SELECT activation_id FROM platform.workspace_activation WHERE email = :email AND consumed_at IS NULL FOR UPDATE",
            nativeQuery = true)
    List<UUID> lockPendingByEmail(@Param("email") String email);

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceActivationJpaRepository$Pending(a.activationId, a.organizationId,
                a.lastSentAt) from WorkspaceActivationEntity a where a.activationId = :id
            """)
    Optional<Pending> pending(@Param("id") UUID activationId);

    /** A resend replaces the proof only, never the authorized membership terms. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceActivationEntity a set a.proofHash = :proof, a.generation = a.generation + 1,
                a.expiresAt = :expiresAt, a.lastSentAt = :now
            where a.activationId = :id and a.organizationId = :organization
            """)
    int resend(@Param("organization") UUID organization, @Param("id") UUID activationId, @Param("proof") String proofHash,
            @Param("expiresAt") Instant expiresAt, @Param("now") Instant now);

    @Query("select a.generation from WorkspaceActivationEntity a where a.activationId = :id and a.organizationId = :organization")
    Optional<Long> generation(@Param("organization") UUID organization, @Param("id") UUID activationId);

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceActivationJpaRepository$Listed(a.activationId, a.fullName, a.email,
                a.roles, a.departmentId, d.name, a.occupationReferenceId, o.name, a.createdAt, a.expiresAt, j.status)
            from WorkspaceActivationEntity a
            left join DepartmentReferenceEntity d on d.departmentId = a.departmentId and d.organizationId = a.organizationId
            left join OccupationDepartmentReferenceEntity o on o.occupationReferenceId = a.occupationReferenceId
                and o.departmentId = a.departmentId and o.organizationId = a.organizationId
            left join OutboxEventEntity e on e.aggregateId = a.activationId and e.eventType = 'MEMBER_ACTIVATION'
                and e.sourceRevision = a.generation
            left join ProcessingJobEntity j on j.eventId = e.eventId and j.handler = 'MEMBER_ACTIVATION_EMAIL'
            where a.organizationId = :organization and a.consumedAt is null
            order by a.createdAt desc
            """)
    List<Listed> pendingOf(@Param("organization") UUID organization);

    record ProofOwner(UUID activationId, UUID organizationId) {}

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceActivationJpaRepository$ProofOwner(a.activationId, a.organizationId)
            from WorkspaceActivationEntity a where a.proofHash = :proof
            """)
    Optional<ProofOwner> findByProof(@Param("proof") String proofHash);

    @Query(value = "SELECT activation_id FROM platform.workspace_activation WHERE activation_id = :id FOR UPDATE",
            nativeQuery = true)
    Optional<UUID> lock(@Param("id") UUID activationId);

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceActivationJpaRepository$Terms(a.fullName, a.email, a.roles,
                a.departmentId, a.occupationReferenceId, a.expiresAt, a.consumedAt)
            from WorkspaceActivationEntity a where a.activationId = :id and a.organizationId = :organization
            """)
    Optional<Terms> terms(@Param("organization") UUID organization, @Param("id") UUID activationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceActivationEntity a set a.consumedAt = :now, a.accountId = :account
            where a.activationId = :id and a.organizationId = :organization
            """)
    int consume(@Param("organization") UUID organization, @Param("id") UUID activationId, @Param("account") UUID account,
            @Param("now") Instant now);
}
