package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayReceiptEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Append-only initial pathway command replies (trigger initial_pathway_receipt_immutable), scoped by organization and actor. */
public interface InitialPathwayReceiptJpaRepository extends Repository<InitialPathwayReceiptEntity, InitialPathwayReceiptEntity.Key>,
        InsertOnlyRepository<InitialPathwayReceiptEntity> {

    record Row(Integer httpStatus, String bodyHash, String response) {}

    @Query("""
            select new com.adaptlearngraph.repository.InitialPathwayReceiptJpaRepository$Row(r.httpStatus, r.bodyHash, r.response)
            from InitialPathwayReceiptEntity r
            where r.organizationId = :org and r.actorId = :actor and r.operation = :operation and r.resource = :resource
              and r.retryKey = :key
            """)
    List<Row> find(@Param("org") UUID organizationId, @Param("actor") UUID actorId, @Param("operation") String operation,
            @Param("resource") String resource, @Param("key") String retryKey);
}
