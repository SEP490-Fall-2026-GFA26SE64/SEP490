package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ModuleGrantAuditEntity;
import org.springframework.data.repository.Repository;

/** Append-only authoring grant history: insert is the only write. */
public interface ModuleGrantAuditJpaRepository
        extends Repository<ModuleGrantAuditEntity, Long>, InsertOnlyRepository<ModuleGrantAuditEntity> {
}
