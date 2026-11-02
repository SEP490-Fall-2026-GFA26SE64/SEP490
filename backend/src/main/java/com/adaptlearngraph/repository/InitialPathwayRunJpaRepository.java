package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayRunEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Finished generation runs (trigger initial_pathway_run_immutable); insert is the only write. */
public interface InitialPathwayRunJpaRepository extends Repository<InitialPathwayRunEntity, UUID>, InsertOnlyRepository<InitialPathwayRunEntity> {
}
