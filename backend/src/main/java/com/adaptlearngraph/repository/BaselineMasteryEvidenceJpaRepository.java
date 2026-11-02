package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineMasteryEvidenceEntity;
import org.springframework.data.repository.Repository;

/** Immutable baseline mastery initialization evidence: insert is the only write. */
public interface BaselineMasteryEvidenceJpaRepository
        extends Repository<BaselineMasteryEvidenceEntity, BaselineMasteryEvidenceEntity.Key>, InsertOnlyRepository<BaselineMasteryEvidenceEntity> {
}
