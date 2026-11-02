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

    @Query("select b.blueprintId from BaselineBlueprintEntity b where b.organizationId = :org and b.occupationId = :occupation")
    List<UUID> identity(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    /** Legacy unscoped fixed-Blueprint lookup kept for the {@link BaselineBlueprintStore} port's Occupation-only method. */
    @Query("select b.blueprintId from BaselineBlueprintEntity b where b.occupationId = :occupation")
    List<UUID> byOccupation(@Param("occupation") String occupationId);

    // Native: row lock (FOR UPDATE) on the scope's Blueprint identity.
    @Query(value = """
            SELECT blueprint_id FROM platform.baseline_blueprint WHERE organization_id=:org AND occupation_id=:occupation FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockIdentity(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

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
            INSERT INTO platform.baseline_blueprint(blueprint_id,organization_id,occupation_id,created_by)
            VALUES (:id,:org,:occupation,:actor) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int ensureAdaptive(@Param("id") UUID blueprintId, @Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("actor") UUID actorId);

    // Native: idempotent fixed identity creation (INSERT ... SELECT ... ON CONFLICT (blueprint_id) DO NOTHING).
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.baseline_blueprint (
                blueprint_id, organization_id, occupation_id, created_by, created_at)
            SELECT :blueprintId, account.organization_id, CAST(:occupationId AS text), :createdBy, :createdAt
            FROM platform.account account
            WHERE account.account_id = :createdBy
              AND account.organization_id = :organizationId
            ON CONFLICT (blueprint_id) DO NOTHING
            """, nativeQuery = true)
    int ensureFixed(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId,
            @Param("occupationId") String occupationId, @Param("createdBy") UUID createdBy, @Param("createdAt") Instant createdAt);

    @Query("""
            select count(b) from BaselineBlueprintEntity b
            where b.blueprintId = :blueprintId and b.organizationId = :organizationId and b.occupationId = :occupationId
            """)
    long countMatching(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId,
            @Param("occupationId") String occupationId);

    @Query("""
            select count(b) from BaselineBlueprintEntity b
            where b.blueprintId = :blueprintId and b.organizationId = :organizationId and b.occupationId is null
            """)
    long countMatchingWithoutOccupation(@Param("blueprintId") UUID blueprintId, @Param("organizationId") UUID organizationId);

    /** Next version in the namespace shared by fixed and adaptive versions of the scope's identity. */
    @Query("""
            select coalesce(max(registry.version), 0) + 1 from BaselineBlueprintVersionRegistryEntity registry
            join BaselineBlueprintEntity identity on identity.blueprintId = registry.blueprintId
            where identity.organizationId = :org and identity.occupationId = :occupation
            """)
    Integer nextVersion(@Param("org") UUID organizationId, @Param("occupation") String occupationId);
}
