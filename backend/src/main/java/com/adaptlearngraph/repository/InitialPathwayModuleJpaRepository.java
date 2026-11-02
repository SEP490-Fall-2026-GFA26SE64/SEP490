package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayModuleEntity;
import org.springframework.data.repository.Repository;

/** Ordered revision modules (trigger initial_pathway_module_immutable); insert is the only write. */
public interface InitialPathwayModuleJpaRepository extends Repository<InitialPathwayModuleEntity, InitialPathwayModuleEntity.Key>, InsertOnlyRepository<InitialPathwayModuleEntity> {
}
