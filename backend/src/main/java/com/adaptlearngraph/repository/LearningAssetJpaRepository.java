package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningAssetEntity;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Organization-scoped private learning file metadata; insert-only. */
public interface LearningAssetJpaRepository extends Repository<LearningAssetEntity, UUID>, InsertOnlyRepository<LearningAssetEntity> {

    record Row(UUID id, String organizationId, String createdBy, String objectKey, String filename, String mediaType,
               Long byteSize, String sha256, Double durationSeconds, Instant createdAt) {}

    String ROW = "select new com.adaptlearngraph.repository.LearningAssetJpaRepository$Row(a.id, a.organizationId, a.createdBy,"
            + " a.objectKey, a.filename, a.mediaType, a.byteSize, a.sha256, a.durationSeconds, a.createdAt)"
            + " from LearningAssetEntity a where a.organizationId = :organization";

    @Query(ROW + " and a.id = :id")
    List<Row> asset(@Param("organization") String organizationId, @Param("id") UUID id);

    @Query(ROW + " and a.id in :ids")
    List<Row> assets(@Param("organization") String organizationId, @Param("ids") Collection<UUID> ids);
}
