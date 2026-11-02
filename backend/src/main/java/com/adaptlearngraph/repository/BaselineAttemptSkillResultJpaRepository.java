package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptSkillResultEntity;
import org.springframework.data.repository.Repository;

/** Immutable finalized per-skill attempt results: insert is the only write. */
public interface BaselineAttemptSkillResultJpaRepository
        extends Repository<BaselineAttemptSkillResultEntity, BaselineAttemptSkillResultEntity.Key>, InsertOnlyRepository<BaselineAttemptSkillResultEntity> {
}
