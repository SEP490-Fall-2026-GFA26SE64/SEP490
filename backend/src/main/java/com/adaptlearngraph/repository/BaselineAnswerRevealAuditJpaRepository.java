package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAnswerRevealAuditEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Append-only answer reveal audit. */
public interface BaselineAnswerRevealAuditJpaRepository
        extends Repository<BaselineAnswerRevealAuditEntity, UUID>, InsertOnlyRepository<BaselineAnswerRevealAuditEntity> {
}