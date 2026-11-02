package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.SubscriptionPeriodEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Immutable paid periods: append-only; overlap is rejected by trigger subscription_period_overlap_guard. */
public interface SubscriptionPeriodJpaRepository
        extends Repository<SubscriptionPeriodEntity, UUID>, InsertOnlyRepository<SubscriptionPeriodEntity> {
}