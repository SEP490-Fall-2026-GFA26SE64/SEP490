package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Pathway actor grants and safe review labels; every read is scoped by the trusted organization. */
public interface PathwayActorJpaRepository extends Repository<AccountEntity, UUID> {

    @Query("""
            select count(a) > 0 from AccountEntity a join AccountRoleEntity r on r.accountId = a.accountId
            where a.accountId = :account and a.organizationId = :org and a.active = true and r.roleCode = :role
            """)
    boolean hasActiveRole(@Param("org") UUID organizationId, @Param("account") UUID accountId, @Param("role") String roleCode);

    @Query("""
            select count(a) > 0 from AccountEntity a
            join OrganizationMembershipEntity m on m.accountId = a.accountId and m.organizationId = a.organizationId
            join OrganizationMembershipRoleEntity g on g.membershipId = m.membershipId
            where a.organizationId = :org and a.accountId = :expert and a.active = true and m.active = true and g.roleCode = 'DOMAIN_EXPERT'
            """)
    boolean isActiveMemberExpert(@Param("org") UUID organizationId, @Param("expert") UUID expertId);

    @Query("""
            select p.fullName from AccountEntity a join WorkspaceAccountProfileEntity p on p.accountId = a.accountId
            where a.organizationId = :org and a.accountId = :learner
            """)
    List<String> workspaceFullName(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Query("select a.identifier from AccountEntity a where a.organizationId = :org and a.accountId = :learner")
    List<String> identifier(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);
}
