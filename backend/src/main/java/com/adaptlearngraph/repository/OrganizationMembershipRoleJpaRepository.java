package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.OrganizationMembershipRoleEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface OrganizationMembershipRoleJpaRepository
        extends Repository<OrganizationMembershipRoleEntity, OrganizationMembershipRoleEntity.Key>,
        InsertOnlyRepository<OrganizationMembershipRoleEntity> {

    @Query("""
            select r.roleCode from OrganizationMembershipRoleEntity r
            join OrganizationMembershipEntity m on m.membershipId = r.membershipId
            where m.accountId = :accountId
            """)
    List<String> roleCodesOfAccount(@Param("accountId") UUID accountId);
}
