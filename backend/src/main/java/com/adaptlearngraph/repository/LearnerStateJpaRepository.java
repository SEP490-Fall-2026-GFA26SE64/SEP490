package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearnerStateEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface LearnerStateJpaRepository extends Repository<LearnerStateEntity, UUID>, InsertOnlyRepository<LearnerStateEntity> {

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional(com.adaptlearngraph.constants.TransactionManagers.JPA)
    @org.springframework.data.jpa.repository.Query(value = "INSERT INTO platform.learner_state(learner_id) VALUES (:learner) ON CONFLICT(learner_id) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@org.springframework.data.repository.query.Param("learner") UUID learnerId);}
