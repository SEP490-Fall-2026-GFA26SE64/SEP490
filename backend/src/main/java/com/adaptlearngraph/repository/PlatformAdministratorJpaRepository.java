package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.PlatformAdministratorEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface PlatformAdministratorJpaRepository
        extends Repository<PlatformAdministratorEntity, UUID>, InsertOnlyRepository<PlatformAdministratorEntity> {
    boolean existsByAccountId(UUID accountId);

    /** PostgreSQL transaction timestamp ({@code now()}). */
    @org.springframework.data.jpa.repository.Query("select current_instant")
    java.time.Instant databaseNow();
}
