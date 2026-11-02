package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAssessmentTransitionEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Append-only baseline lifecycle history; the immutable-history and actor-scope triggers stay authoritative. */
public interface BaselineAssessmentTransitionJpaRepository
        extends Repository<BaselineAssessmentTransitionEntity, UUID>, InsertOnlyRepository<BaselineAssessmentTransitionEntity> {
}
