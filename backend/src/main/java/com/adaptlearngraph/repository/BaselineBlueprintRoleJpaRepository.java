package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineBlueprintRoleEntity;
import org.springframework.data.repository.Repository;

/** Insert-only fixed Blueprint role configuration; reads go through {@link BaselineBlueprintVersionJpaRepository}. */
public interface BaselineBlueprintRoleJpaRepository extends Repository<BaselineBlueprintRoleEntity, BaselineBlueprintRoleEntity.Key>, InsertOnlyRepository<BaselineBlueprintRoleEntity> {
}