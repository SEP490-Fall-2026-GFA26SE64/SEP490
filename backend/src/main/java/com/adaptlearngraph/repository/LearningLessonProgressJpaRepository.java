package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningLessonProgressEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped learner lesson progress per module revision. */
public interface LearningLessonProgressJpaRepository
        extends Repository<LearningLessonProgressEntity, LearningLessonProgressEntity.Key> {

    record Row(String lessonId, Double positionSeconds, String watchedIntervals, Boolean reachedEnd, Instant completedAt,
               Instant updatedAt, Instant coverageUpdatedAt) {}

    @Query("select new com.adaptlearngraph.repository.LearningLessonProgressJpaRepository$Row(p.lessonId, p.positionSeconds,"
            + " p.watchedIntervals, p.reachedEnd, p.completedAt, p.updatedAt, p.coverageUpdatedAt)"
            + " from LearningLessonProgressEntity p where p.organizationId = :organization and p.learnerId = :learner"
            + " and p.moduleId = :module and p.revision = :revision")
    List<Row> progress(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId, @Param("revision") int revision);

    // Native: INSERT ... ON CONFLICT DO UPDATE; timestamps arrive as text and are parsed by PostgreSQL as before.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.learning_lesson_progress(organization_id, learner_id, module_id, revision, lesson_id,
                position_seconds, watched_intervals, reached_end, completed_at, coverage_updated_at)
            VALUES (:organization, :learner, :module, :revision, :lesson, :position, CAST(:watched AS jsonb), :reachedEnd,
                CAST(CAST(:completedAt AS text) AS timestamptz), CAST(CAST(:coverageUpdatedAt AS text) AS timestamptz))
            ON CONFLICT (organization_id, learner_id, module_id, revision, lesson_id) DO UPDATE
            SET position_seconds = EXCLUDED.position_seconds, watched_intervals = EXCLUDED.watched_intervals,
                reached_end = EXCLUDED.reached_end, completed_at = EXCLUDED.completed_at,
                coverage_updated_at = EXCLUDED.coverage_updated_at, updated_at = now()
            """, nativeQuery = true)
    int save(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId, @Param("revision") int revision, @Param("lesson") String lessonId,
            @Param("position") double positionSeconds, @Param("watched") String watchedIntervals,
            @Param("reachedEnd") boolean reachedEnd, @Param("completedAt") String completedAt,
            @Param("coverageUpdatedAt") String coverageUpdatedAt);
}
