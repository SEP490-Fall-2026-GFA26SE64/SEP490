package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearnerStateEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface LearnerStateJpaRepository extends Repository<LearnerStateEntity, UUID>, InsertOnlyRepository<LearnerStateEntity> {
}
