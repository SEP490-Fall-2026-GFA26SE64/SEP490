package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningSettingsAuditEntity;
import org.springframework.data.repository.Repository;

/** Append-only upload limit history: insert is the only write. */
public interface LearningSettingsAuditJpaRepository
        extends Repository<LearningSettingsAuditEntity, Long>, InsertOnlyRepository<LearningSettingsAuditEntity> {
}
