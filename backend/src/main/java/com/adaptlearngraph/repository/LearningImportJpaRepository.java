package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningImportEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Excel/ZIP learning imports, always scoped by organization and the importing actor. */
public interface LearningImportJpaRepository extends Repository<LearningImportEntity, UUID>, InsertOnlyRepository<LearningImportEntity> {

    @Query("select i.document from LearningImportEntity i"
            + " where i.id = :id and i.organizationId = :organization and i.actorId = :actor")
    List<String> document(@Param("id") UUID id, @Param("organization") String organizationId, @Param("actor") String actorId);

    // Native: row lock (FOR UPDATE) on the preview document read as a scalar.
    @Query(value = "SELECT document::text FROM platform.learning_import WHERE id = :id AND organization_id = :organization"
            + " AND actor_id = :actor FOR UPDATE", nativeQuery = true)
    List<String> lockDocument(@Param("id") UUID id, @Param("organization") String organizationId, @Param("actor") String actorId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update LearningImportEntity i set i.state = 'COMMITTED', i.committedAt = current_timestamp, i.document = :document"
            + " where i.id = :id and i.organizationId = :organization and i.actorId = :actor")
    int commit(@Param("id") UUID id, @Param("organization") String organizationId, @Param("actor") String actorId,
            @Param("document") String document);
}
