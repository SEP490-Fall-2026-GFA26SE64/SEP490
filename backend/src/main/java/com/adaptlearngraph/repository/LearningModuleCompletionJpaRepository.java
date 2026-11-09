package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningModuleCompletionEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
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

    record KnowledgeRow(String skillId,String moduleId,Integer revision,String contentVersion,Instant completedAt,String knowledgeLevel,String requirementSnapshot) {}
    @Query("""
            select new com.adaptlearngraph.repository.LearningModuleCompletionJpaRepository$KnowledgeRow(
                c.skillId,c.moduleId,c.revision,c.contentVersion,c.completedAt,p.knowledgeLevel,p.requirementSnapshot)
            from LearningModuleCompletionEntity c left join LearningCompletionRequirementEntity p
                on p.organizationId=c.organizationId and p.learnerId=c.learnerId and p.moduleId=c.moduleId and p.revision=c.revision
            where c.organizationId=:org and c.learnerId=:learner and c.skillId=:skill order by c.completedAt,c.moduleId,c.revision
            """)
    List<KnowledgeRow> knowledge(@Param("org") String org,@Param("learner") String learner,@Param("skill") String skill,Pageable page);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.learning_completion_requirement(organization_id,learner_id,module_id,revision,knowledge_level,requirement_snapshot)
            SELECT :org,:learner,:module,:revision,:level,CAST(:snapshot AS jsonb)
            FROM platform.learning_module_completion c WHERE c.organization_id=:org AND c.learner_id=:learner
                AND c.module_id=:module AND c.revision=:revision AND c.skill_id=:skill AND c.content_version=:version
            ON CONFLICT DO NOTHING
            """,nativeQuery=true)
    int freezeRequirement(@Param("org") String org,@Param("learner") String learner,@Param("module") String module,
            @Param("revision") int revision,@Param("skill") String skill,@Param("version") String version,@Param("level") String level,@Param("snapshot") String snapshot);
    @Query(value="""
            SELECT requirement_snapshot::text FROM platform.learning_completion_requirement
            WHERE organization_id=:org AND learner_id=:learner AND module_id=:module AND revision=:revision AND knowledge_level=:level
            """,nativeQuery=true)
    Optional<String> requirement(@Param("org") String org,@Param("learner") String learner,@Param("module") String module,@Param("revision") int revision,@Param("level") String level);
}
