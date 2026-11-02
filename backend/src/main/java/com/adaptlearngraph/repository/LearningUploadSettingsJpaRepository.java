package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningUploadSettingsEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Platform-wide singleton upload limits (not organization data) with optimistic versioning. */
public interface LearningUploadSettingsJpaRepository extends Repository<LearningUploadSettingsEntity, Boolean> {

    record Row(Long videoBytes, Long imageBytes, Long zipBytes, Long version, String changedBy, Instant changedAt) {}

    @Query("select new com.adaptlearngraph.repository.LearningUploadSettingsJpaRepository$Row(s.videoBytes, s.imageBytes,"
            + " s.zipBytes, s.version, s.changedBy, s.changedAt) from LearningUploadSettingsEntity s where s.singleton = true")
    List<Row> current();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update LearningUploadSettingsEntity s set s.videoBytes = :video, s.imageBytes = :image, s.zipBytes = :zip,"
            + " s.version = s.version + 1, s.changedBy = :actor, s.changedAt = current_timestamp"
            + " where s.singleton = true and s.version = :version")
    int update(@Param("video") long videoBytes, @Param("image") long imageBytes, @Param("zip") long zipBytes,
            @Param("actor") String actor, @Param("version") long expectedVersion);
}
