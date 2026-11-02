package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationMembershipRoleEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface OrganizationMembershipRoleJpaRepository
        extends Repository<OrganizationMembershipRoleEntity, OrganizationMembershipRoleEntity.Key>,
        InsertOnlyRepository<OrganizationMembershipRoleEntity> {

    @Query("""
            select r.roleCode from OrganizationMembershipRoleEntity r
            join OrganizationMembershipEntity m on m.membershipId = r.membershipId
            where m.accountId = :accountId
            """)
    List<String> roleCodesOfAccount(@Param("accountId") UUID accountId);

    @Query("select r.roleCode from OrganizationMembershipRoleEntity r where r.membershipId = :member")
    List<String> roleCodesOf(@Param("member") UUID membershipId);

    /** Roles of every membership in one organization (avoids one query per listed member). */
    @Query("""
            select r from OrganizationMembershipRoleEntity r join OrganizationMembershipEntity m on m.membershipId = r.membershipId
            where m.organizationId = :organization
            """)
    List<OrganizationMembershipRoleEntity> rolesInOrganization(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("delete from OrganizationMembershipRoleEntity r where r.membershipId = :member")
    int deleteOf(@Param("member") UUID membershipId);
}
