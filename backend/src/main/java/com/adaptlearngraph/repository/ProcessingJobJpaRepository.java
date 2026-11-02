package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ProcessingJobEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface ProcessingJobJpaRepository extends Repository<ProcessingJobEntity, UUID>, InsertOnlyRepository<ProcessingJobEntity> {
}
