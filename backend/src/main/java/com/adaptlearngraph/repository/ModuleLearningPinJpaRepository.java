package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ModuleLearningPinEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped learner revision pins. */
public interface ModuleLearningPinJpaRepository extends Repository<ModuleLearningPinEntity, ModuleLearningPinEntity.Key> {

    // Native: INSERT ... ON CONFLICT DO NOTHING keeps the first pinned revision.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.module_learning_pin (organization_id, learner_id, module_id, revision)"
            + " VALUES (:organization, :learner, :module, :revision) ON CONFLICT DO NOTHING", nativeQuery = true)
    int pin(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId, @Param("revision") int revision);

    @Query("select p.revision from ModuleLearningPinEntity p"
            + " where p.organizationId = :organization and p.learnerId = :learner and p.moduleId = :module")
    List<Integer> revision(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId);

    @Query("select count(p) from ModuleLearningPinEntity p where p.organizationId = :organization and p.moduleId = :module")
    long countByModule(@Param("organization") String organizationId, @Param("module") String moduleId);

    @Query("select p.learnerId from ModuleLearningPinEntity p"
            + " where p.organizationId = :organization and p.moduleId = :module and p.revision < :revision")
    List<String> learnersBefore(@Param("organization") String organizationId, @Param("module") String moduleId,
            @Param("revision") int revision);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update ModuleLearningPinEntity p set p.revision = :to where p.organizationId = :organization"
            + " and p.learnerId = :learner and p.moduleId = :module and p.revision = :from")
    int switchRevision(@Param("organization") String organizationId, @Param("learner") String learnerId,
            @Param("module") String moduleId, @Param("from") int from, @Param("to") int to);
}
