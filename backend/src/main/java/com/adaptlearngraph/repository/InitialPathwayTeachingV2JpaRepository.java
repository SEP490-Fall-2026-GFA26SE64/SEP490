package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayTeachingV2Entity;
import org.springframework.data.repository.Repository;

/** Format-2 module teaching assignments (trigger initial_teaching_v2_immutable); insert is the only write. */
public interface InitialPathwayTeachingV2JpaRepository extends Repository<InitialPathwayTeachingV2Entity, InitialPathwayTeachingV2Entity.Key>, InsertOnlyRepository<InitialPathwayTeachingV2Entity> {
}
