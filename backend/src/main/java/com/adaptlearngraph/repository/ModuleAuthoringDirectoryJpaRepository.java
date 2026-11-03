package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Choice;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Organization staff choices for module authoring and manual pathways. Learning tables key organizations and accounts
 * as text, so account UUIDs are compared through their text form exactly as before.
 */
public interface ModuleAuthoringDirectoryJpaRepository extends Repository<AccountEntity, UUID> {

    @Query("""
            select new com.adaptlearngraph.entities.domain.ModuleAuthoring$Choice(cast(a.accountId as String), coalesce(p.fullName, a.identifier))
            from AccountEntity a left join WorkspaceAccountProfileEntity p on p.accountId = a.accountId
            where cast(a.organizationId as String) = :organization
            order by a.identifier
            """)
    List<Choice> staff(@Param("organization") String organizationId);

    @Query("""
            select new com.adaptlearngraph.entities.domain.ModuleAuthoring$Choice(cast(a.accountId as String), coalesce(p.fullName, a.identifier))
            from AccountEntity a
            join OrganizationMembershipEntity m on m.accountId = a.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            left join WorkspaceAccountProfileEntity p on p.accountId = a.accountId
            where cast(a.organizationId as String) = :organization and a.active = true and m.active = true and r.roleCode = 'EMPLOYEE'
            order by a.identifier
            """)
    List<Choice> employees(@Param("organization") String organizationId);

    @Query("""
            select new com.adaptlearngraph.entities.domain.ModuleAuthoring$Choice(cast(a.accountId as String), a.identifier)
            from AccountEntity a
            join OrganizationMembershipEntity m on m.accountId = a.accountId and m.organizationId = a.organizationId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where cast(a.organizationId as String) = :organization and a.active = true and m.active = true
              and r.roleCode = 'DOMAIN_EXPERT'
            order by a.identifier
            """)
    List<Choice> experts(@Param("organization") String organizationId);

    @Query("""
            select count(a) > 0 from AccountEntity a
            join OrganizationMembershipEntity m on m.accountId = a.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where cast(a.organizationId as String) = :organization and cast(a.accountId as String) = :account
              and a.active = true and m.active = true and r.roleCode = 'EMPLOYEE'
            """)
    boolean activeEmployee(@Param("organization") String organizationId, @Param("account") String accountId);
}
