package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineBlueprintEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stable Blueprint identities shared by the fixed and adaptive Blueprint stores. Identity creation stays native for its
 * ON CONFLICT idempotency; the adaptive scope lock stays native for FOR UPDATE.
 */
public interface BaselineBlueprintJpaRepository
        extends Repository<BaselineBlueprintEntity, UUID>, InsertOnlyRepository<BaselineBlueprintEntity> {

    @Query("select b.blueprintId from BaselineBlueprintEntity b where b.organizationId = :org and b.jobPositionId = :jobPosition")
    List<UUID> identity(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);

    /** Legacy unscoped fixed-Blueprint lookup kept for the {@link BaselineBlueprintStore} port's JobPosition-only method. */
    @Query("select b.blueprintId from BaselineBlueprintEntity b where b.jobPositionId = :jobPosition")
    List<UUID> byJobPosition(@Param("jobPosition") String jobPositionId);

    // Native: row lock (FOR UPDATE) on the scope's Blueprint identity.
    @Query(value = """
            SELECT blueprint_id FROM platform.baseline_blueprint WHERE organization_id=:org AND job_position_id=:jobPosition FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockIdentity(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);

    /** Locks a Blueprint identity for assessment generation, scoped to the generating actor's organization. */
    // Native: row lock (FOR UPDATE OF identity) joined to the actor account row.
    @Query(value = """
            SELECT identity.blueprint_id
            FROM platform.baseline_blueprint identity
            JOIN platform.account actor
              ON actor.account_id = :createdBy
             AND actor.organization_id = identity.organization_id
            WHERE identity.blueprint_id = :blueprintId
            FOR UPDATE OF identity
            """, nativeQuery = true)
    List<UUID> lockForActor(@Param("blueprintId") UUID blueprintId, @Param("createdBy") UUID createdBy);

    @Query("""
            select count(a) > 0 from AccountEntity a
            where a.accountId = :actor and a.organizationId = :org and a.active = true
            """)
    boolean activeActor(@Param("org") UUID organizationId, @Param("actor") UUID actorId);

    @Query("select a.organizationId from AccountEntity a where a.accountId = :actor")
    List<UUID> actorOrganization(@Param("actor") UUID actorId);

    // Native: idempotent identity creation (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.baseline_blueprint(blueprint_id,organization_id,job_position_id,created_by)
            VALUES (:id,:org,:jobPosition,:actor) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int ensureAdaptive(@Param("id") UUID blueprintId, @Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId,
            @Param("actor") UUID actorId);

    // Native: idempotent fixed identity creation (INSERT ... SELECT ... ON CONFLICT (blueprint_id) DO NOTHING).
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.baseline_blueprint (
                blueprint_id, organization_id, job_position_id, created_by, created_at)
            SELECT :blueprintId, account.organization_id, CAST(:jobPositionId AS text), :createdBy, :createdAt
            FROM platform.account account
            WHERE account.account_id = :createdBy
              AND account.organization_id = :organizationId
            ON CONFLICT (blueprint_id) DO NOTHING
            """, nativeQuery = true)
    int ensureFixed(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId,
            @Param("jobPositionId") String jobPositionId, @Param("createdBy") UUID createdBy, @Param("createdAt") Instant createdAt);

    @Query("""
            select count(b) from BaselineBlueprintEntity b
            where b.blueprintId = :blueprintId and b.organizationId = :organizationId and b.jobPositionId = :jobPositionId
            """)
    long countMatching(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId,
            @Param("jobPositionId") String jobPositionId);

    @Query("""
            select count(b) from BaselineBlueprintEntity b
            where b.blueprintId = :blueprintId and b.organizationId = :organizationId and b.jobPositionId is null
            """)
    long countMatchingWithoutJobPosition(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId);

    /** Next version in the namespace shared by fixed and adaptive versions of the scope's identity. */
    @Query("""
            select coalesce(max(registry.version), 0) + 1 from BaselineBlueprintVersionRegistryEntity registry
            join BaselineBlueprintEntity identity on identity.blueprintId = registry.blueprintId
            where identity.organizationId = :org and identity.jobPositionId = :jobPosition
            """)
    Integer nextVersion(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);
}
