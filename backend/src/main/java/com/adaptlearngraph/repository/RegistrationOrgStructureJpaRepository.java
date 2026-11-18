package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RegistrationOrgStructureEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface RegistrationOrgStructureJpaRepository
        extends Repository<RegistrationOrgStructureEntity, UUID>, InsertOnlyRepository<RegistrationOrgStructureEntity> {

    boolean existsByRegistrationId(UUID registrationId);
}
