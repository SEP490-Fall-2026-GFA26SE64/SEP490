package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintSkillEntity;
import org.springframework.data.repository.Repository;

/** Insert-only adaptive Blueprint micro-skill snapshots; reads go through {@link BaselineAdaptiveBlueprintVersionJpaRepository}. */
public interface BaselineAdaptiveBlueprintSkillJpaRepository extends Repository<BaselineAdaptiveBlueprintSkillEntity, BaselineAdaptiveBlueprintSkillEntity.Key>, InsertOnlyRepository<BaselineAdaptiveBlueprintSkillEntity> {
}