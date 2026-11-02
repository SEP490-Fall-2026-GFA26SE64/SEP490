package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.WorkspaceCatalogImportEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Leased catalog-import jobs. Claiming keeps native {@code FOR UPDATE OF c SKIP LOCKED} so concurrent workers never
 * claim the same job; every completion is fenced by the claiming lease and the PENDING state.
 */
public interface WorkspaceCatalogImportJpaRepository extends Repository<WorkspaceCatalogImportEntity, UUID>, InsertOnlyRepository<WorkspaceCatalogImportEntity> {
    record Claimed(UUID organizationId, UUID registrationId, Integer attempts, List<String> selectedNodeIds) {}

    @Query(value = """
            SELECT c.organization_id FROM platform.workspace_catalog_import c
            JOIN platform.registration_catalog_selection s USING (registration_id)
            WHERE c.state = 'PENDING' AND c.next_attempt_at <= :now AND (c.lease_until IS NULL OR c.lease_until < :now)
            ORDER BY c.created_at LIMIT 1 FOR UPDATE OF c SKIP LOCKED
            """, nativeQuery = true)
    Optional<UUID> lockNextDue(@Param("now") Instant now);

    @Query("""
            select new com.adaptlearngraph.repository.WorkspaceCatalogImportJpaRepository$Claimed(c.organizationId,
                c.registrationId, c.attempts, s.selectedNodeIds)
            from WorkspaceCatalogImportEntity c join RegistrationCatalogSelectionEntity s on s.registrationId = c.registrationId
            where c.organizationId = :organization
            """)
    Optional<Claimed> claimed(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceCatalogImportEntity c set c.attempts = c.attempts + 1, c.leaseOwner = :lease,
                c.leaseUntil = :until, c.updatedAt = :now
            where c.organizationId = :organization
            """)
    int lease(@Param("organization") UUID organizationId, @Param("lease") UUID lease, @Param("until") Instant until,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceCatalogImportEntity c set c.state = 'SUCCEEDED', c.templateVersion = :version,
                c.templateSha256 = :sha, c.nodeCount = :nodes, c.relationshipCount = :relationships, c.failureCode = null,
                c.leaseOwner = null, c.leaseUntil = null, c.completedAt = :now, c.updatedAt = :now
            where c.organizationId = :organization and c.leaseOwner = :lease and c.state = 'PENDING'
            """)
    int succeed(@Param("organization") UUID organizationId, @Param("lease") UUID lease, @Param("version") String templateVersion,
            @Param("sha") String templateSha256, @Param("nodes") int nodes, @Param("relationships") int relationships,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceCatalogImportEntity c set c.failureCode = :failure, c.nextAttemptAt = :next,
                c.leaseOwner = null, c.leaseUntil = null, c.updatedAt = :now
            where c.organizationId = :organization and c.leaseOwner = :lease and c.state = 'PENDING'
            """)
    int retry(@Param("organization") UUID organizationId, @Param("lease") UUID lease, @Param("failure") String failureCode,
            @Param("next") Instant nextAttempt, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceCatalogImportEntity c set c.state = 'FAILED', c.failureCode = :failure, c.leaseOwner = null,
                c.leaseUntil = null, c.updatedAt = :now
            where c.organizationId = :organization and c.leaseOwner = :lease and c.state = 'PENDING'
            """)
    int fail(@Param("organization") UUID organizationId, @Param("lease") UUID lease, @Param("failure") String failureCode,
            @Param("now") Instant now);
}
