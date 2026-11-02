package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.OrganizationMembershipEntity;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface OrganizationMembershipJpaRepository
        extends Repository<OrganizationMembershipEntity, UUID>, InsertOnlyRepository<OrganizationMembershipEntity> {
}
