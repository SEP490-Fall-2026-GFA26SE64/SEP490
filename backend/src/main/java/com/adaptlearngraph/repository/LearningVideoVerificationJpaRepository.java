package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningVideoVerificationEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped external video duration verifications. */
public interface LearningVideoVerificationJpaRepository
        extends Repository<LearningVideoVerificationEntity, LearningVideoVerificationEntity.Key> {

    record Row(String videoUrl, Double durationSeconds) {}

    /** Verifications of the given URLs in the organization, newest first (first row per URL is the effective one). */
    @Query("select new com.adaptlearngraph.repository.LearningVideoVerificationJpaRepository$Row(v.videoUrl, v.durationSeconds)"
            + " from LearningVideoVerificationEntity v where v.organizationId = :organization and v.videoUrl in :urls"
            + " order by v.verifiedAt desc")
    List<Row> newestFirst(@Param("organization") String organizationId, @Param("urls") Collection<String> videoUrls);

    // Native: INSERT ... ON CONFLICT DO UPDATE with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.learning_video_verification VALUES (:organization, :actor, :url, :seconds, now())"
            + " ON CONFLICT (organization_id, actor_id, video_url) DO UPDATE SET"
            + " duration_seconds = EXCLUDED.duration_seconds, verified_at = now()", nativeQuery = true)
    int verify(@Param("organization") String organizationId, @Param("actor") String actorId, @Param("url") String videoUrl,
            @Param("seconds") double seconds);
}
