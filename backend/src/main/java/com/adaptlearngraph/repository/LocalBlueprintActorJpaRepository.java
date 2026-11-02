package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Local adaptive Blueprint API actor (one explicit server-configured account; never production authentication). The
 * account row itself determines the organization, so lookups are by account id.
 */
public interface LocalBlueprintActorJpaRepository extends Repository<AccountEntity, UUID> {
    record Account(UUID accountId, UUID organizationId, Boolean active) {}

    @Query("""
            select new com.adaptlearngraph.repository.LocalBlueprintActorJpaRepository$Account(a.accountId, a.organizationId, a.active)
            from AccountEntity a where a.accountId = :actor and a.organizationId is not null
            """)
    List<Account> account(@Param("actor") UUID accountId);

    @Query("select r.roleCode from AccountRoleEntity r where r.accountId = :actor")
    List<String> roles(@Param("actor") UUID accountId);
}
