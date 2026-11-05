package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningModuleCompletionEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.time.Instant;
import java.util.List;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LearningModuleCompletionJpaRepository extends Repository<LearningModuleCompletionEntity, LearningModuleCompletionEntity.Key> {
    record Row(String skillId, String moduleId, Integer revision, String contentVersion, Instant completedAt) {}
    @Query("select new com.adaptlearngraph.repository.LearningModuleCompletionJpaRepository$Row(c.skillId,c.moduleId,c.revision,c.contentVersion,c.completedAt) from LearningModuleCompletionEntity c where c.organizationId=:org and c.learnerId=:learner and c.skillId=:skill order by c.completedAt,c.moduleId,c.revision")
    List<Row> find(@Param("org") String org, @Param("learner") String learner, @Param("skill") String skill);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="INSERT INTO platform.learning_module_completion(organization_id,learner_id,module_id,revision,skill_id,content_version,completed_at) VALUES (:org,:learner,:module,:revision,:skill,:version,CAST(:completed AS timestamptz)) ON CONFLICT DO NOTHING",nativeQuery=true)
    int insert(@Param("org") String org,@Param("learner") String learner,@Param("module") String module,@Param("revision") int revision,@Param("skill") String skill,@Param("version") String version,@Param("completed") String completed);
}
