package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineBlueprintSkillEntity;
import org.springframework.data.repository.Repository;

/** Insert-only fixed Blueprint micro-skill quotas; reads go through {@link BaselineBlueprintVersionJpaRepository}. */
public interface BaselineBlueprintSkillJpaRepository extends Repository<BaselineBlueprintSkillEntity, BaselineBlueprintSkillEntity.Key>, InsertOnlyRepository<BaselineBlueprintSkillEntity> {
}