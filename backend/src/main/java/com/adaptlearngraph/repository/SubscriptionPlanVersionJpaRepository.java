package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.SubscriptionPlanVersionEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Immutable plan versions: append-only. */
public interface SubscriptionPlanVersionJpaRepository
        extends Repository<SubscriptionPlanVersionEntity, UUID>, InsertOnlyRepository<SubscriptionPlanVersionEntity> {
}
