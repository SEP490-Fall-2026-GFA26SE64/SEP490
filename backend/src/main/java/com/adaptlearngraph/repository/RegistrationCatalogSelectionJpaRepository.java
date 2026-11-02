package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RegistrationCatalogSelectionEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface RegistrationCatalogSelectionJpaRepository
        extends Repository<RegistrationCatalogSelectionEntity, UUID>, InsertOnlyRepository<RegistrationCatalogSelectionEntity> {

    boolean existsByRegistrationId(UUID registrationId);
}
