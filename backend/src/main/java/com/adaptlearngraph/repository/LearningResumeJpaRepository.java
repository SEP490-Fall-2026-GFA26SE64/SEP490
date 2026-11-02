package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningResumeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped last active lesson per learner module. */
public interface LearningResumeJpaRepository extends Repository<LearningResumeEntity, LearningResumeEntity.Key> {

    @Query("select r.lessonId from LearningResumeEntity r"
            + " where r.organizationId = :organization and r.learnerId = :learner and r.moduleId = :module")
    List<String> lesson(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId);

    // Native: INSERT ... ON CONFLICT DO UPDATE with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.learning_resume VALUES (:organization, :learner, :module, :lesson, now())"
            + " ON CONFLICT (organization_id, learner_id, module_id) DO UPDATE SET lesson_id = EXCLUDED.lesson_id,"
            + " updated_at = now()", nativeQuery = true)
    int save(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId, @Param("lesson") String lessonId);
}
