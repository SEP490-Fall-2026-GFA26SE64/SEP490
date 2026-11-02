package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintRoleEntity;
import org.springframework.data.repository.Repository;

/** Insert-only adaptive Blueprint role snapshots; reads go through {@link BaselineAdaptiveBlueprintVersionJpaRepository}. */
public interface BaselineAdaptiveBlueprintRoleJpaRepository extends Repository<BaselineAdaptiveBlueprintRoleEntity, BaselineAdaptiveBlueprintRoleEntity.Key>, InsertOnlyRepository<BaselineAdaptiveBlueprintRoleEntity> {
}