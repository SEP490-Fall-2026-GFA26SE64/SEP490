package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineBlueprintActivationEventEntity;
import org.springframework.data.repository.Repository;

/** Append-only Blueprint activation history; the pointer-match trigger stays authoritative. */
public interface BaselineBlueprintActivationEventJpaRepository extends Repository<BaselineBlueprintActivationEventEntity, java.util.UUID>, InsertOnlyRepository<BaselineBlueprintActivationEventEntity> {
}