package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Append-only audit trail: insert is the only write. */
public interface AuditEventJpaRepository extends Repository<AuditEventEntity, UUID>, InsertOnlyRepository<AuditEventEntity> {
}
