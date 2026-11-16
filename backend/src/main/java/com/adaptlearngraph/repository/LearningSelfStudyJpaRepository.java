package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningSelfStudyEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LearningSelfStudyJpaRepository extends Repository<LearningSelfStudyEntity, LearningSelfStudyEntity.Key> {
    @Query("select count(s)>0 from LearningSelfStudyEntity s where s.organizationId=:org and s.learnerId=:learner and s.moduleId=:module")
    boolean admitted(@Param("org") String org,@Param("learner") String learner,@Param("module") String module);
    @Query(value="SELECT EXISTS(SELECT 1 FROM platform.learning_self_study WHERE organization_id=:org AND learner_id=:learner AND module_id=:module AND revision=:revision)",nativeQuery=true)
    boolean admittedRevision(@Param("org") String org,@Param("learner") String learner,@Param("module") String module,@Param("revision") int revision);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="INSERT INTO platform.learning_self_study(organization_id,learner_id,module_id,revision,skill_id) VALUES (:org,:learner,:module,:revision,:skill) ON CONFLICT DO NOTHING",nativeQuery=true)
    int admit(@Param("org") String org,@Param("learner") String learner,@Param("module") String module,@Param("revision") int revision,@Param("skill") String skill);
}
