package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningVersionSwitchEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Append-only learner revision switches: insert is the only write. */
public interface LearningVersionSwitchJpaRepository
        extends Repository<LearningVersionSwitchEntity, UUID>, InsertOnlyRepository<LearningVersionSwitchEntity> {
}
