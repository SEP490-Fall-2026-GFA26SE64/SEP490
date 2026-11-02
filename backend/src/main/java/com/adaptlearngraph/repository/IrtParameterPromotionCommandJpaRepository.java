package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.IrtParameterPromotionCommandEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable promotion receipts, readable only by their organization and actor. */
public interface IrtParameterPromotionCommandJpaRepository
        extends Repository<IrtParameterPromotionCommandEntity, IrtParameterPromotionCommandEntity.Key>,
        InsertOnlyRepository<IrtParameterPromotionCommandEntity> {

    record Receipt(String requestHash, UUID organizationId, UUID questionBankId, UUID modelVersionId, Long selectionRevision,
            UUID parameterSetId, String parameterHash, UUID actorId, Instant occurredAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.IrtParameterPromotionCommandJpaRepository$Receipt(
                c.requestHash,c.organizationId,c.questionBankId,c.modelVersionId,c.selectionRevision,c.parameterSetId,
                c.parameterHash,c.actorId,c.occurredAt)
            from IrtParameterPromotionCommandEntity c
            where c.organizationId=:org and c.actorId=:actor and c.idempotencyKey=:key
            """)
    Optional<Receipt> receipt(@Param("org") UUID organizationId, @Param("actor") UUID actorId, @Param("key") String idempotencyKey);
}
