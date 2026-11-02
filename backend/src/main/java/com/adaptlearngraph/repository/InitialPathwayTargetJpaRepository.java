package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayTargetEntity;
import org.springframework.data.repository.Repository;

/** Format-1 module skill targets (trigger initial_pathway_target_immutable); insert is the only write. */
public interface InitialPathwayTargetJpaRepository extends Repository<InitialPathwayTargetEntity, InitialPathwayTargetEntity.Key>, InsertOnlyRepository<InitialPathwayTargetEntity> {
}
