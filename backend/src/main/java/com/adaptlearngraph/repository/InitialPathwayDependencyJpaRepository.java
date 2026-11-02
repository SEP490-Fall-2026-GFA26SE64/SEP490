package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayDependencyEntity;
import org.springframework.data.repository.Repository;

/** Revision readiness gates (trigger initial_pathway_dependency_immutable); insert is the only write. */
public interface InitialPathwayDependencyJpaRepository extends Repository<InitialPathwayDependencyEntity, InitialPathwayDependencyEntity.Key>, InsertOnlyRepository<InitialPathwayDependencyEntity> {
}
