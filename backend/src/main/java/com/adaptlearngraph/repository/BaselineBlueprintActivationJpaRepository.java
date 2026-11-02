package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineBlueprintActivationEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Current Blueprint pointer per organization and Occupation; revision rules are enforced by the activation trigger. */
public interface BaselineBlueprintActivationJpaRepository
        extends Repository<BaselineBlueprintActivationEntity, BaselineBlueprintActivationEntity.Key>,
        InsertOnlyRepository<BaselineBlueprintActivationEntity> {

    record Row(Long activationRevision, UUID blueprintId, Integer blueprintVersion, UUID activatedBy, Instant activatedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintActivationJpaRepository$Row(a.activationRevision, a.blueprintId,
                a.blueprintVersion, a.activatedBy, a.activatedAt)
            from BaselineBlueprintActivationEntity a where a.organizationId = :org and a.occupationId = :occupation
            """)
    List<Row> current(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    // Native: row lock (FOR UPDATE) on the scope's activation pointer.
    @Query(value = """
            SELECT blueprint_id FROM platform.baseline_blueprint_activation WHERE organization_id=:org AND occupation_id=:occupation FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lock(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineBlueprintActivationEntity a set a.blueprintVersion = :version, a.activationRevision = :revision,
                a.activatedBy = :actor, a.activatedAt = :time
            where a.organizationId = :org and a.occupationId = :occupation and a.blueprintId = :id and a.activationRevision = :expected
            """)
    int activate(@Param("org") UUID organizationId, @Param("occupation") String occupationId, @Param("id") UUID blueprintId,
            @Param("expected") long expectedRevision, @Param("version") Integer version, @Param("revision") long revision,
            @Param("actor") UUID actorId, @Param("time") Instant time);
}
