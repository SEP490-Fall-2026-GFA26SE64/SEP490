package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationMembershipEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization memberships; every read and write is scoped by organization (or by the acting account itself). */
public interface OrganizationMembershipJpaRepository
        extends Repository<OrganizationMembershipEntity, UUID>, InsertOnlyRepository<OrganizationMembershipEntity> {

    record ActorAccount(Boolean accountActive, UUID organizationId, Boolean membershipActive, UUID membershipId) {}

    record Listed(UUID membershipId, UUID accountId, String fullName, String email, Boolean active, UUID departmentId,
                  UUID jobPositionReferenceId, Long revision, String departmentName, String jobPositionName,
                  Boolean accountActive) {}

    @Query("""
            select new com.adaptlearngraph.repository.OrganizationMembershipJpaRepository$ActorAccount(a.active, a.organizationId,
                coalesce(m.active, false), m.membershipId)
            from AccountEntity a left join OrganizationMembershipEntity m on m.accountId = a.accountId
            where a.accountId = :account
            """)
    Optional<ActorAccount> actor(@Param("account") UUID accountId);

    @Query("""
            select new com.adaptlearngraph.repository.OrganizationMembershipJpaRepository$Listed(m.membershipId, m.accountId,
                coalesce(p.fullName, r.adminName), a.identifier, m.active, m.departmentId, m.jobPositionReferenceId, m.revision,
                d.name, o.name, a.active)
            from OrganizationMembershipEntity m join AccountEntity a on a.accountId = m.accountId
            left join OrganizationRegistrationEntity r on r.accountId = m.accountId
            left join WorkspaceAccountProfileEntity p on p.accountId = m.accountId
            left join DepartmentReferenceEntity d on d.departmentId = m.departmentId and d.organizationId = m.organizationId
            left join JobPositionDepartmentReferenceEntity o on o.jobPositionReferenceId = m.jobPositionReferenceId
                and o.organizationId = m.organizationId and o.departmentId = m.departmentId
            where m.organizationId = :organization order by a.identifier
            """)
    List<Listed> members(@Param("organization") UUID organizationId);

    record Administrator(UUID organizationId, UUID accountId, String fullName, String email,
                         Boolean active, Boolean accountActive) {}

    @Query("""
            select new com.adaptlearngraph.repository.OrganizationMembershipJpaRepository$Administrator(
                m.organizationId, m.accountId, coalesce(p.fullName, r.adminName), a.identifier, m.active, a.active)
            from OrganizationMembershipEntity m join AccountEntity a on a.accountId = m.accountId
                and a.organizationId = m.organizationId
            join OrganizationMembershipRoleEntity role on role.membershipId = m.membershipId
            left join WorkspaceAccountProfileEntity p on p.accountId = m.accountId
            left join OrganizationRegistrationEntity r on r.accountId = m.accountId
            where m.organizationId in :organizations and role.roleCode = 'ORGANIZATION_ADMINISTRATOR'
            order by a.identifier, m.accountId
            """)
    List<Administrator> administrators(@Param("organizations") List<UUID> organizationIds);

    /** Active seats: active membership of an active account with any role except ORGANIZATION_ADMINISTRATOR. */
    @Query("""
            select count(distinct m) from OrganizationMembershipEntity m join AccountEntity a on a.accountId = m.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where m.organizationId = :organization and m.active = true and a.active = true and r.roleCode != 'ORGANIZATION_ADMINISTRATOR'
            """)
    long usedSeats(@Param("organization") UUID organizationId);

    @Query("""
            select count(distinct a.accountId) from AccountEntity a join OrganizationMembershipEntity m on m.accountId = a.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where m.organizationId = :organization and a.active = true and m.active = true and r.roleCode != 'ORGANIZATION_ADMINISTRATOR'
            """)
    long distinctEmployeeAccounts(@Param("organization") UUID organizationId);

    @Query("""
            select count(m) from OrganizationMembershipEntity m join AccountEntity a on a.accountId = m.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where m.organizationId = :organization and m.active = true and a.active = true
              and r.roleCode = 'ORGANIZATION_ADMINISTRATOR'
            """)
    long activeAdministrators(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationMembershipEntity m set m.departmentId = :department, m.jobPositionReferenceId = :jobPosition
            where m.membershipId = :member and m.organizationId = :organization
            """)
    int assignReferences(@Param("organization") UUID organizationId, @Param("member") UUID membershipId,
            @Param("department") UUID departmentId, @Param("jobPosition") UUID jobPositionReferenceId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationMembershipEntity m set m.active = :active, m.revision = m.revision + 1, m.updatedAt = :now
            where m.membershipId = :member and m.organizationId = :organization
            """)
    int changeActive(@Param("organization") UUID organizationId, @Param("member") UUID membershipId,
            @Param("active") boolean active, @Param("now") Instant now);

    record Staff(UUID accountId, String name) {}

    /** Active staff of one organization with the given role, ordered by display name as before. */
    @Query("""
            select new com.adaptlearngraph.repository.OrganizationMembershipJpaRepository$Staff(a.accountId,
                coalesce(p.fullName, a.identifier))
            from AccountEntity a join OrganizationMembershipEntity m on m.accountId = a.accountId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            left join WorkspaceAccountProfileEntity p on p.accountId = a.accountId
            where a.organizationId = :organization and m.organizationId = :organization and a.active = true and m.active = true
              and r.roleCode = :role
            order by coalesce(p.fullName, a.identifier), a.accountId
            """)
    List<Staff> staff(@Param("organization") UUID organizationId, @Param("role") String roleCode);
}
