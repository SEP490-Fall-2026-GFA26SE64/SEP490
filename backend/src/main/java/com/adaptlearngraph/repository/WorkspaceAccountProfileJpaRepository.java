package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.WorkspaceAccountProfileEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Member security profile. Registered owners are excluded: their auth state lives on the registration row. */
public interface WorkspaceAccountProfileJpaRepository
        extends Repository<WorkspaceAccountProfileEntity, UUID>, InsertOnlyRepository<WorkspaceAccountProfileEntity> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceAccountProfileEntity p set p.authVersion = p.authVersion + 1, p.recoveryRequired = false
            where p.accountId = :accountId
              and not exists (select 1 from OrganizationRegistrationEntity r where r.accountId = :accountId)
            """)
    int completeEnrollment(@Param("accountId") UUID accountId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceAccountProfileEntity p set p.authVersion = p.authVersion + 1, p.recoveryRequired = true
            where p.accountId = :accountId
            """)
    int beginRecovery(@Param("accountId") UUID accountId);

    @Query("select p.authVersion from WorkspaceAccountProfileEntity p where p.accountId = :accountId")
    Optional<Long> authVersion(@Param("accountId") UUID accountId);
}
