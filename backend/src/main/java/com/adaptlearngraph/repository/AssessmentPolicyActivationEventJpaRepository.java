package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentPolicyActivationEventEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface AssessmentPolicyActivationEventJpaRepository
        extends Repository<AssessmentPolicyActivationEventEntity, UUID>, InsertOnlyRepository<AssessmentPolicyActivationEventEntity> {
}