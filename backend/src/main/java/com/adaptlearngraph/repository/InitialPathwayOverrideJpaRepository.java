package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayOverrideEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Expert edit history (trigger initial_pathway_override_immutable); insert is the only write. */
public interface InitialPathwayOverrideJpaRepository extends Repository<InitialPathwayOverrideEntity, UUID>, InsertOnlyRepository<InitialPathwayOverrideEntity> {
}
