package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentPolicyCommandEntity;
import org.springframework.data.repository.Repository;

public interface AssessmentPolicyCommandJpaRepository extends Repository<AssessmentPolicyCommandEntity, AssessmentPolicyCommandEntity.Key>,
        InsertOnlyRepository<AssessmentPolicyCommandEntity> {
}